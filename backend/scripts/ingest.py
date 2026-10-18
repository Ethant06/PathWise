"""Download UW-area OSM walk network + Seattle GIS layers and attach edge metadata."""

from __future__ import annotations

import json
import pickle
import sys
from datetime import datetime, timezone
from pathlib import Path

import geopandas as gpd
import osmnx as ox
from shapely.geometry import Point
from shapely.strtree import STRtree

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.arcgis import fetch_arcgis_layer  # noqa: E402
from app.config import (  # noqa: E402
    ARCGIS_CROSSWALKS,
    ARCGIS_SIDEWALKS,
    ARCGIS_STREETLIGHTS,
    BBOX,
    CACHE_DIR,
    CROSSWALK_BUFFER_M,
    GRAPH_PATH,
    LIGHT_BUFFER_M,
    MANIFEST_PATH,
    PLACE_BUFFER_M,
    POIS_PATH,
    NAMED_BUILDINGS,
    NAMED_LEISURE,
    NAMED_RAIL,
    PUBLIC_PLACE_AMENITIES,
    PUBLIC_TOURISM,
    SIDEWALK_BUFFER_M,
    WALK_SPEED_MPS,
)

UTM = "EPSG:32610"
WGS84 = "EPSG:4326"


def _text(value: object) -> str:
    """Turn OSM/pandas empties into a blank string. NaN must not become the label 'nan'."""
    if value is None or isinstance(value, (list, tuple, dict)):
        if isinstance(value, (list, tuple)) and value:
            return _text(value[0])
        return ""
    try:
        if value != value:  # NaN
            return ""
    except Exception:
        return ""
    text = str(value).strip()
    if text.lower() in {"nan", "none", "<na>", "nat"}:
        return ""
    return text


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _write_geojson(path: Path, collection: dict) -> None:
    path.write_text(json.dumps(collection), encoding="utf-8")


def _gdf_from_fc(collection: dict) -> gpd.GeoDataFrame:
    features = collection.get("features") or []
    if not features:
        return gpd.GeoDataFrame(geometry=[], crs=WGS84)
    gdf = gpd.GeoDataFrame.from_features(features, crs=WGS84)
    return gdf


def fetch_walk_graph() -> tuple[object, dict]:
    west, south, east, north = BBOX
    ox.settings.http_user_agent = "PathWise/1.0 (UW walking routes; student project)"
    ox.settings.requests_timeout = 180
    print(f"Downloading OSM walk network bbox={BBOX} …")
    graph = ox.graph_from_bbox((west, south, east, north), network_type="walk", simplify=True)
    graph = ox.distance.add_edge_lengths(graph)
    for _u, _v, _k, data in graph.edges(keys=True, data=True):
        length = float(data.get("length") or 0.0)
        data["travel_time"] = length / WALK_SPEED_MPS
        highway = data.get("highway")
        if isinstance(highway, list):
            data["highway"] = highway[0] if highway else ""
    meta = {
        "ok": True,
        "fetched_at": _now(),
        "source": "OpenStreetMap via OSMnx (network_type=walk)",
        "nodes": graph.number_of_nodes(),
        "edges": graph.number_of_edges(),
        "error": None,
    }
    print(f"  nodes={meta['nodes']} edges={meta['edges']}")
    return graph, meta


def _public_place(row: object) -> tuple[bool, str, str]:
    amenity = _text(row.get("amenity"))
    shop = _text(row.get("shop"))
    tourism = _text(row.get("tourism"))
    building = _text(row.get("building"))
    leisure = _text(row.get("leisure"))
    railway = _text(row.get("railway"))
    office = _text(row.get("office"))
    name = _text(row.get("name"))
    if amenity in PUBLIC_PLACE_AMENITIES or bool(shop) or tourism in PUBLIC_TOURISM:
        category = amenity or shop or tourism or "place"
        return True, name or shop or amenity or tourism or "Place", category
    if name and building in NAMED_BUILDINGS:
        return True, name, building
    if name and leisure in NAMED_LEISURE:
        return True, name, leisure
    if name and railway in NAMED_RAIL:
        return True, name, railway
    if name and office:
        return True, name, office
    return False, "", ""


def fetch_places() -> tuple[gpd.GeoDataFrame, dict]:
    west, south, east, north = BBOX
    tags = {
        "amenity": True,
        "shop": True,
        "tourism": True,
        "building": sorted(NAMED_BUILDINGS),
        "leisure": sorted(NAMED_LEISURE),
        "railway": sorted(NAMED_RAIL),
        "office": True,
    }
    print("Downloading OSM places, shops, and named buildings …")
    try:
        ox.settings.http_user_agent = "PathWise/1.0 (UW walking routes; student project)"
        ox.settings.requests_timeout = 180
        gdf = ox.features_from_bbox((west, south, east, north), tags)
        gdf = gdf.reset_index()
        rows = []
        seen: set[str] = set()
        for _, row in gdf.iterrows():
            geom = row.geometry
            if geom is None or geom.is_empty:
                continue
            keep, name, category = _public_place(row)
            if not keep:
                continue
            point = geom if geom.geom_type == "Point" else geom.representative_point()
            osm_type = _text(row.get("element_type")) or "node"
            osm_id = _text(row.get("osmid")) or _text(row.get("id"))
            place_id = f"{osm_type}:{osm_id}"
            if place_id in seen:
                continue
            seen.add(place_id)
            hours = row.get("opening_hours")
            hours_s = hours if isinstance(hours, str) else None
            rows.append(
                {
                    "name": name.strip(),
                    "category": category,
                    "osm_id": place_id,
                    "opening_hours": hours_s,
                    "hours_available": bool(hours_s),
                    "geometry": Point(point.x, point.y),
                }
            )
        pois = gpd.GeoDataFrame(rows, crs=WGS84) if rows else gpd.GeoDataFrame(geometry=[], crs=WGS84)
        meta = {
            "ok": True,
            "fetched_at": _now(),
            "source": "OpenStreetMap places, shops, and named buildings via OSMnx",
            "feature_count": int(len(pois)),
            "with_opening_hours": int(pois["hours_available"].sum()) if len(pois) else 0,
            "error": None,
        }
        print(f"  public places={meta['feature_count']} with hours={meta['with_opening_hours']}")
        return pois, meta
    except Exception as exc:  # noqa: BLE001
        meta = {
            "ok": False,
            "fetched_at": _now(),
            "source": "OpenStreetMap places, shops, and named buildings via OSMnx",
            "feature_count": 0,
            "with_opening_hours": 0,
            "error": f"{type(exc).__name__}: {exc}",
        }
        print(f"  places FAILED: {meta['error']}")
        return gpd.GeoDataFrame(geometry=[], crs=WGS84), meta


def fetch_layer(name: str, url: str) -> tuple[gpd.GeoDataFrame, dict]:
    print(f"Downloading {name} …")
    collection = fetch_arcgis_layer(url, BBOX)
    meta = collection.pop("pathwise_meta")
    meta["name"] = name
    gdf = _gdf_from_fc(collection)
    collection["pathwise_meta"] = meta
    _write_geojson(CACHE_DIR / f"{name}.geojson", collection)
    status = "ok" if meta.get("ok") else f"FAILED {meta.get('error')}"
    print(f"  {name}: {meta.get('feature_count', 0)} features ({status})")
    return gdf, meta


def _index(geoms) -> tuple[STRtree, list]:
    valid = [g for g in geoms if g is not None and not g.is_empty]
    if not valid:
        return STRtree([]), []
    return STRtree(valid), valid


def attach_edge_metadata(graph, lights, sidewalks, crosswalks, pois):
    print("Projecting layers and joining metadata onto walk edges …")
    nodes_gdf, edges_gdf = ox.graph_to_gdfs(graph)
    edges_utm = edges_gdf.to_crs(UTM).copy()
    lights_utm = lights.to_crs(UTM) if len(lights) else lights
    sidewalks_utm = sidewalks.to_crs(UTM) if len(sidewalks) else sidewalks
    crosswalks_utm = crosswalks.to_crs(UTM) if len(crosswalks) else crosswalks
    pois_utm = pois.to_crs(UTM) if len(pois) else pois

    light_tree, light_geoms = _index(list(lights_utm.geometry) if len(lights_utm) else [])
    sw_tree, sw_geoms = _index(list(sidewalks_utm.geometry) if len(sidewalks_utm) else [])
    cw_tree, cw_geoms = _index(list(crosswalks_utm.geometry) if len(crosswalks_utm) else [])
    poi_ids = list(pois["osm_id"]) if len(pois) else []
    poi_pairs = []
    if len(pois_utm):
        for pid, g in zip(poi_ids, list(pois_utm.geometry)):
            if g is not None and not g.is_empty:
                poi_pairs.append((pid, g))
    poi_tree, poi_geoms = _index([g for _pid, g in poi_pairs])
    poi_id_for_geom = [pid for pid, _g in poi_pairs]

    has_lights = len(light_geoms) > 0
    has_sw = len(sw_geoms) > 0
    has_cw = len(cw_geoms) > 0
    has_poi = len(poi_geoms) > 0

    light_counts = []
    sw_flags = []
    cw_flags = []
    nearby_ids = []

    for geom in edges_utm.geometry:
        if geom is None or geom.is_empty:
            light_counts.append(0)
            sw_flags.append(False)
            cw_flags.append(False)
            nearby_ids.append([])
            continue

        if has_lights:
            hits = light_tree.query(geom.buffer(LIGHT_BUFFER_M))
            light_counts.append(int(len(list(hits))))
        else:
            light_counts.append(0)

        if has_sw:
            hits = sw_tree.query(geom.buffer(SIDEWALK_BUFFER_M))
            near = False
            buf = geom.buffer(SIDEWALK_BUFFER_M)
            for idx in hits:
                if buf.intersects(sw_geoms[idx]):
                    near = True
                    break
            sw_flags.append(near)
        else:
            sw_flags.append(False)

        if has_cw:
            hits = cw_tree.query(geom.buffer(CROSSWALK_BUFFER_M))
            near = False
            buf = geom.buffer(CROSSWALK_BUFFER_M)
            for idx in hits:
                if buf.intersects(cw_geoms[idx]):
                    near = True
                    break
            cw_flags.append(near)
        else:
            cw_flags.append(False)

        ids: list[str] = []
        if has_poi:
            hits = poi_tree.query(geom.buffer(PLACE_BUFFER_M))
            buf = geom.buffer(PLACE_BUFFER_M)
            for idx in hits:
                g = poi_geoms[int(idx)]
                if buf.intersects(g):
                    pid = poi_id_for_geom[int(idx)]
                    if pid:
                        ids.append(pid)
        nearby_ids.append(ids)

    edges_gdf = edges_gdf.copy()
    edges_gdf["light_count"] = light_counts
    edges_gdf["near_sidewalk"] = sw_flags
    edges_gdf["near_crosswalk"] = cw_flags
    edges_gdf["nearby_poi_ids"] = nearby_ids
    if has_lights:
        max_l = max(light_counts) or 1
        edges_gdf["light_score"] = [min(1.0, c / min(6.0, max_l)) for c in light_counts]
    else:
        edges_gdf["light_score"] = [None] * len(edges_gdf)

    rebuilt = ox.graph_from_gdfs(nodes_gdf, edges_gdf)
    # copy scores back if graph_from_gdfs identity differs — use rebuilt
    return rebuilt


def main() -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    graph, walk_meta = fetch_walk_graph()
    pois, poi_meta = fetch_places()
    if len(pois):
        pois.to_file(POIS_PATH, driver="GeoJSON")
    else:
        _write_geojson(POIS_PATH, {"type": "FeatureCollection", "features": []})

    lights, light_meta = fetch_layer("streetlights", ARCGIS_STREETLIGHTS)
    sidewalks, sw_meta = fetch_layer("sidewalks", ARCGIS_SIDEWALKS)
    crosswalks, cw_meta = fetch_layer("crosswalks", ARCGIS_CROSSWALKS)

    graph = attach_edge_metadata(graph, lights, sidewalks, crosswalks, pois)
    with GRAPH_PATH.open("wb") as handle:
        pickle.dump(graph, handle)

    manifest = {
        "fetched_at": _now(),
        "bbox": list(BBOX),
        "crs_storage": WGS84,
        "crs_analysis": UTM,
        "layers": {
            "walking_network": walk_meta,
            "places": poi_meta,
            "streetlights": light_meta,
            "sidewalks": sw_meta,
            "crosswalks": cw_meta,
        },
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Wrote {GRAPH_PATH} and {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
