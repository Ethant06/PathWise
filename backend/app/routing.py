from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

import networkx as nx
from shapely.geometry import LineString

from app.config import (
    LAMBDA_MAX,
    MAX_SAFETY_DETOUR,
    NEAREST_NODE_MAX_M,
    UW_CENTER_LAT,
    UW_CENTER_LNG,
    W_CROSSWALKS,
    W_LIGHTS,
    W_PLACES,
    W_SIDEWALKS,
    WALK_SPEED_MPS,
)
from app.hours import as_pacific, is_open_at

# Approximate meters/degree at UW latitude for nearest-node checks
_M_PER_DEG_LAT = 111_320
_M_PER_DEG_LNG = 75_000


def _dist_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    dy = (lat1 - lat2) * _M_PER_DEG_LAT
    dx = (lng1 - lng2) * _M_PER_DEG_LNG
    return (dx * dx + dy * dy) ** 0.5


def nearest_node(graph: nx.MultiDiGraph, lat: float, lng: float) -> int:
    best = None
    best_d = 1e18
    for node, data in graph.nodes(data=True):
        d = _dist_m(lat, lng, float(data["y"]), float(data["x"]))
        if d < best_d:
            best_d = d
            best = node
    if best is None or best_d > NEAREST_NODE_MAX_M:
        raise ValueError(
            "Point is too far from the walking network. "
            "Choose a point around UW, the University District, Roosevelt, "
            "Wallingford, Fremont, Eastlake, Montlake, or Ravenna."
        )
    return best


def _edge_time(data: dict[str, Any]) -> float:
    t = data.get("travel_time")
    if t is not None:
        return float(t)
    return float(data.get("length") or 1.0) / 1.35


def _pick_min_edge(graph: nx.MultiDiGraph, u: int, v: int, cost_fn) -> dict[str, Any]:
    keyed = graph.get_edge_data(u, v) or {}
    best_data = None
    best_cost = 1e18
    for _key, data in keyed.items():
        cost = cost_fn(data)
        if cost < best_cost:
            best_cost = cost
            best_data = data
    if best_data is None:
        raise KeyError(f"No edge {u}->{v}")
    return best_data


def _coords_for_edge(graph: nx.MultiDiGraph, u: int, v: int, data: dict[str, Any]) -> list[list[float]]:
    geom = data.get("geometry")
    if geom is not None and not geom.is_empty:
        coords = [[float(x), float(y)] for x, y in geom.coords]
        if len(coords) >= 2:
            return coords
    return [
        [float(graph.nodes[u]["x"]), float(graph.nodes[u]["y"])],
        [float(graph.nodes[v]["x"]), float(graph.nodes[v]["y"])],
    ]


def _path_geometry(graph: nx.MultiDiGraph, nodes: list[int], cost_fn) -> tuple[list[list[float]], float, float, dict[str, Any]]:
    coords: list[list[float]] = []
    distance = 0.0
    duration = 0.0
    light_hits = 0
    sidewalk_hits = 0
    crosswalk_hits = 0
    open_place_hits = 0
    edges = 0
    lights_known = 0
    sidewalks_known = 0

    for u, v in zip(nodes, nodes[1:]):
        data = _pick_min_edge(graph, u, v, cost_fn)
        segment = _coords_for_edge(graph, u, v, data)
        if coords and segment and coords[-1] == segment[0]:
            coords.extend(segment[1:])
        else:
            coords.extend(segment if not coords else segment[1:] or segment)
        length = data.get("length")
        if not length:
            length = _edge_time(data) * WALK_SPEED_MPS
        distance += float(length)
        duration += _edge_time(data)
        edges += 1
        if data.get("light_score") is not None:
            lights_known += 1
            if (data.get("light_count") or 0) > 0:
                light_hits += 1
        if data.get("near_sidewalk") is not None:
            sidewalks_known += 1
            if data.get("near_sidewalk"):
                sidewalk_hits += 1
        if data.get("near_crosswalk"):
            crosswalk_hits += 1
        open_place_hits += int(data.get("_open_count") or 0)

    stats = {
        "edge_count": edges,
        "edges_near_streetlights": light_hits,
        "edges_near_sidewalks": sidewalk_hits,
        "edges_near_marked_crosswalks": crosswalk_hits,
        "open_place_proximity_sum": open_place_hits,
        "streetlight_coverage_share": (light_hits / lights_known) if lights_known else None,
        "sidewalk_coverage_share": (sidewalk_hits / sidewalks_known) if sidewalks_known else None,
    }
    if len(coords) < 2:
        coords = [
            [UW_CENTER_LNG, UW_CENTER_LAT],
            [UW_CENTER_LNG + 0.0001, UW_CENTER_LAT],
        ]
    return coords, distance, duration, stats


def _attach_endpoints(
    coords: list[list[float]],
    distance: float,
    duration: float,
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
) -> tuple[list[list[float]], float, float]:
    """Connect the sidewalk path to the person's GPS point and the destination pin."""
    line = list(coords)
    extra_m = 0.0
    start_m = _dist_m(origin_lat, origin_lng, line[0][1], line[0][0])
    end_m = _dist_m(dest_lat, dest_lng, line[-1][1], line[-1][0])
    if start_m > 1:
        line.insert(0, [origin_lng, origin_lat])
        extra_m += start_m
    if end_m > 1:
        line.append([dest_lng, dest_lat])
        extra_m += end_m
    return line, distance + extra_m, duration + extra_m / WALK_SPEED_MPS


def _multigraph_weight(cost_fn):
    def weight(u, v, keyed):  # noqa: ARG001
        return min(cost_fn(data) for data in keyed.values())

    return weight


def _shortest(graph: nx.MultiDiGraph, orig: int, dest: int, cost_fn) -> list[int]:
    try:
        return nx.shortest_path(graph, orig, dest, weight=_multigraph_weight(cost_fn))
    except nx.NetworkXNoPath as exc:
        raise ValueError(
            "No connected walking path between those points on the OSM pedestrian network."
        ) from exc


def _penalty(data: dict[str, Any], coverage: dict[str, Any]) -> float:
    """Higher is less supported by documented pedestrian metadata. Missing = 0 (unknown)."""
    parts = []
    weights = []
    if coverage.get("streetlights") and data.get("light_score") is not None:
        parts.append(1.0 - float(data.get("light_score") or 0.0))
        weights.append(W_LIGHTS)
    if coverage.get("places"):
        open_count = float(data.get("_open_count") or 0.0)
        place_score = min(1.0, open_count / 3.0)
        parts.append(1.0 - place_score)
        weights.append(W_PLACES)
    if coverage.get("sidewalks"):
        parts.append(0.0 if data.get("near_sidewalk") else 1.0)
        weights.append(W_SIDEWALKS)
    if coverage.get("crosswalks"):
        # Crosswalks matter most on likely roadway crossings; treat as a mild bonus when present.
        parts.append(0.0 if data.get("near_crosswalk") else 0.55)
        weights.append(W_CROSSWALKS)
    if not parts:
        return 0.0
    wsum = sum(weights)
    return sum(p * w for p, w in zip(parts, weights)) / wsum


def _annotate_open_counts(
    graph: nx.MultiDiGraph, poi_hours: dict[str, Optional[str]], when: datetime
) -> dict[str, Optional[bool]]:
    open_state: dict[str, Optional[bool]] = {}
    for poi_id, hours in poi_hours.items():
        open_state[poi_id] = is_open_at(hours, when)
    for _u, _v, _k, data in graph.edges(keys=True, data=True):
        ids = data.get("nearby_poi_ids") or []
        data["_open_count"] = sum(1 for pid in ids if open_state.get(pid) is True)
    return open_state


def _routes_close(a: list[list[float]], b: list[list[float]]) -> bool:
    if a == b:
        return True
    try:
        la, lb = LineString(a), LineString(b)
        if la.is_empty or lb.is_empty:
            return False
        # identical if Hausdorff distance is tiny (~12 m)
        return la.hausdorff_distance(lb) < 0.00012
    except Exception:  # noqa: BLE001
        return False


def _explain_fastest(duration_s: float, distance_m: float) -> str:
    minutes = duration_s / 60.0
    return (
        f"Fastest uses the OSM pedestrian network and estimated walking time only "
        f"({minutes:.0f} min, {distance_m / 1000:.2f} km)."
    )


def _explain_safety(
    *,
    identical: bool,
    extra_min: float,
    stats: dict[str, Any],
    coverage: dict[str, Any],
    duration_s: float,
    distance_m: float,
) -> str:
    if identical:
        return (
            "Safety-focused and fastest follow the same pedestrian path — "
            "no meaningfully different alternative stayed within a 30% time budget."
        )
    bits = []
    if coverage.get("streetlights") and stats.get("edges_near_streetlights"):
        bits.append("documented Seattle City Light poles")
    if coverage.get("places") and stats.get("open_place_proximity_sum"):
        bits.append("public places expected to be open at the selected time")
    if coverage.get("sidewalks") and stats.get("edges_near_sidewalks"):
        bits.append("mapped sidewalks")
    if coverage.get("crosswalks") and stats.get("edges_near_marked_crosswalks"):
        bits.append("marked crosswalks")
    unavailable = coverage.get("unavailable") or []
    missing = ""
    if unavailable:
        missing = " Unavailable layers are ignored, not treated as danger: " + ", ".join(
            unavailable
        ) + "."
    if bits:
        why = (
            "Safety-focused prefers walkways near "
            + ", ".join(bits)
            + f". It adds about {extra_min:.0f} min, staying within roughly 30% extra walking time."
        )
    else:
        why = (
            "Safety-focused used walking time plus any available sidewalk/lighting/place metadata; "
            f"this alternative is {extra_min:.0f} min longer."
        )
    why += (
        f" About {duration_s / 60:.0f} min and {distance_m / 1000:.2f} km. "
        "This is not a crime forecast or a guarantee of safety."
        + missing
    )
    return why


def compute_routes(
    graph: nx.MultiDiGraph,
    coverage: dict[str, Any],
    poi_hours: dict[str, Optional[str]],
    provenance: list[dict[str, Any]],
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    departure_time: datetime,
) -> dict[str, Any]:
    when = as_pacific(departure_time)
    _annotate_open_counts(graph, poi_hours, when)

    orig = nearest_node(graph, origin_lat, origin_lng)
    dest = nearest_node(graph, dest_lat, dest_lng)
    if orig == dest:
        raise ValueError("Origin and destination snap to the same sidewalk node. Pick points farther apart.")

    def time_cost(data: dict[str, Any]) -> float:
        return _edge_time(data)

    fast_nodes = _shortest(graph, orig, dest, time_cost)
    fast_coords, fast_dist, fast_dur, fast_stats = _path_geometry(graph, fast_nodes, time_cost)
    cap = fast_dur * (1.0 + MAX_SAFETY_DETOUR)

    def path_duration(nodes: list[int]) -> float:
        total = 0.0
        for u, v in zip(nodes, nodes[1:]):
            data = _pick_min_edge(graph, u, v, time_cost)
            total += _edge_time(data)
        return total

    def mixed_cost(lam: float):
        def cost(data: dict[str, Any]) -> float:
            return time_cost(data) * (1.0 + lam * _penalty(data, coverage))

        return cost

    # Prefer the strongest safety mix that stays within the detour budget.
    lo, hi = 0.0, LAMBDA_MAX
    best_nodes = fast_nodes
    best_lam = 0.0
    for _ in range(14):
        mid = (lo + hi) / 2.0
        cand = _shortest(graph, orig, dest, mixed_cost(mid))
        dur = path_duration(cand)
        if dur <= cap + 1e-6:
            best_nodes = cand
            best_lam = mid
            lo = mid
        else:
            hi = mid

    # Also try lambda max directly if it already fits.
    max_nodes = _shortest(graph, orig, dest, mixed_cost(LAMBDA_MAX))
    if path_duration(max_nodes) <= cap + 1e-6:
        best_nodes = max_nodes
        best_lam = LAMBDA_MAX

    safety_cost_fn = mixed_cost(best_lam)
    safety_coords, safety_dist, safety_dur, safety_stats = _path_geometry(
        graph, best_nodes, safety_cost_fn
    )
    identical = _routes_close(fast_coords, safety_coords) or best_nodes == fast_nodes
    fast_coords, fast_dist, fast_dur = _attach_endpoints(
        fast_coords, fast_dist, fast_dur, origin_lat, origin_lng, dest_lat, dest_lng
    )
    safety_coords, safety_dist, safety_dur = _attach_endpoints(
        safety_coords, safety_dist, safety_dur, origin_lat, origin_lng, dest_lat, dest_lng
    )
    extra_min = max(0.0, (safety_dur - fast_dur) / 60.0)

    fastest = {
        "geometry": {"type": "LineString", "coordinates": fast_coords},
        "metrics": {
            "distance_m": round(fast_dist, 1),
            "duration_s": round(fast_dur, 1),
            "duration_min": round(fast_dur / 60.0, 1),
            "extra_minutes_vs_fastest": 0.0,
        },
        "explanation": _explain_fastest(fast_dur, fast_dist),
        "factors": fast_stats,
    }
    safety = {
        "geometry": {"type": "LineString", "coordinates": safety_coords},
        "metrics": {
            "distance_m": round(safety_dist, 1),
            "duration_s": round(safety_dur, 1),
            "duration_min": round(safety_dur / 60.0, 1),
            "extra_minutes_vs_fastest": round(extra_min, 1),
        },
        "explanation": _explain_safety(
            identical=identical,
            extra_min=extra_min,
            stats=safety_stats,
            coverage=coverage,
            duration_s=safety_dur,
            distance_m=safety_dist,
        ),
        "factors": {**safety_stats, "safety_mix": round(best_lam, 3)},
    }
    return {
        "fastest": fastest,
        "safety_focused": safety,
        "routes_identical": identical,
        "data_coverage": coverage,
        "provenance": provenance,
        "departure_time_local": when.isoformat(),
        "mock": False,
    }
