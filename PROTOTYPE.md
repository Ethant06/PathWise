# PathWise prototype extraction

This is the working prototype in `Path-Wise`. Use it to rebuild the real API in `PathWise/backend`. The mock server in `PathWise/mock-api` already matches the route and place JSON, and it adds login. This file is the real data, software, and routing behavior.

No API keys. No database. No login in the prototype.

## Software

Python 3.11 or newer. Node.js 20 or newer. The prototype web UI is Next.js. The phone app should be Expo, not this Next.js app.

| Package | Role |
| --- | --- |
| FastAPI | HTTP API |
| Uvicorn | Runs FastAPI |
| Pydantic | Request and response models |
| OSMnx | Downloads the OpenStreetMap walk network and places |
| NetworkX | Dijkstra on the walk graph |
| GeoPandas | Reads and writes geographic files |
| Shapely | Geometry and proximity |
| pyproj | Projects coordinates to UTM zone 10N, EPSG:32610 |
| httpx | Pages the Seattle ArcGIS layers |
| python-dateutil | Installed with the backend |
| pytest | Tests in `backend/tests` |
| Next.js 15, React 19, TypeScript | Prototype website only |
| Tailwind CSS | Prototype website styling |
| MapLibre GL JS | Draws the map in the website |
| OpenFreeMap | Basemap tiles. Style URL below |

Login packages used only by `PathWise/mock-api`, not by this prototype: SQLAlchemy, Alembic, psycopg, PyJWT, pwdlib, pydantic-settings, email-validator, argon2-cffi, python-dotenv.

## Map center and coverage

Center: latitude `47.6553`, longitude `-122.3035`.

Bounding box, west south east north: `-122.332, 47.645, -122.280, 47.672`.

Stored coordinates are WGS84, EPSG:4326. Proximity joins use EPSG:32610. GeoJSON positions are `[longitude, latitude]`.

Route requests must stay inside latitude 47.0 to 48.5 and longitude -123.5 to -121.5. A point farther than 250 meters from a walk-network node is rejected.

## Data sources

All five sources downloaded successfully on 2026-10-17.

| Layer | Source | What to request | Cached result |
| --- | --- | --- | --- |
| Walking network | OpenStreetMap through OSMnx, `network_type="walk"` | Bounding box above | 8,577 nodes, 23,474 edges |
| Public places | OpenStreetMap `amenity`, `shop`, `tourism`, and `opening_hours` | Same bounding box | 754 places, 520 with opening hours |
| Streetlights | Seattle City Light poles | `https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Seattle_City_Light_Poles/FeatureServer/0` | 4,081 features |
| Sidewalks | Seattle SDOT | `https://services.arcgis.com/ZOyb2t4B0UYuYNYH/ArcGIS/rest/services/Sidewalks_CDL/FeatureServer/0` | 2,295 features |
| Marked crosswalks | Seattle SDOT | `https://services.arcgis.com/ZOyb2t4B0UYuYNYH/arcgis/rest/services/Marked_Crosswalks_CDL/FeatureServer/0` | 437 features |

ArcGIS query: `where=1=1`, geometry is the bounding-box envelope, `inSR=4326`, `outSR=4326`, `f=geojson`, page with `resultOffset` and `resultRecordCount`. Keep `fetched_at`, source URL, feature count, and any error. If a layer fails, keep going. Missing data is unknown, not unsafe.

Basemap, not a backend download: `https://tiles.openfreemap.org/styles/liberty`. Attribute OpenStreetMap contributors and OpenFreeMap.

Places kept as public: amenities cafe, restaurant, fast_food, library, university, college, pharmacy, hospital, clinic, doctors, dentist, bank, atm, theatre, cinema, community_centre, arts_centre, marketplace, police, fire_station, post_office, fuel, bar, pub, ice_cream, convenience, supermarket, bookstore, bicycle_rental, toilets, fountain. Any shop. Tourism museum, hotel, attraction, gallery, hostel.

Opening hours use America/Los_Angeles and the selected departure time. `24/7` is open. Empty or unsupported strings such as `sunset` or public-holiday rules are unknown, not closed.

## Files the real backend needs

Copy these from `Path-Wise/backend` into `PathWise/backend` when you replace the mock router. Do not copy `.venv`, `__pycache__`, or `backend/cache`.

| File | Job |
| --- | --- |
| `app/config.py` | Center, bounding box, speeds, buffers, weights, source URLs |
| `app/arcgis.py` | Paged ArcGIS download |
| `app/hours.py` | Opening-hours parser |
| `scripts/ingest.py` | Download and attach metadata to walk edges |
| `app/store.py` | Load the cache at startup and search places |
| `app/routing.py` | Fastest and safety-focused Dijkstra |
| `app/models.py` | Pydantic contracts below |
| `app/main.py` | The four prototype endpoints |
| `requirements.txt` | Python packages above |
| `tests/` | Hours, routing, and API tests |

Cache written by ingest, gitignored in the prototype:

| File | Contents |
| --- | --- |
| `data/cache/walk_graph.pkl` | Walk graph with edge metadata |
| `data/cache/pois.geojson` | Public places |
| `data/cache/streetlights.geojson` | City Light poles |
| `data/cache/sidewalks.geojson` | SDOT sidewalks |
| `data/cache/crosswalks.geojson` | SDOT marked crosswalks |
| `data/cache/manifest.json` | Fetch time and success per layer |

Reproduce:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python scripts/ingest.py
uvicorn app.main:app --reload --port 8000
```

Ingest takes several minutes. The walk graph excludes `motorway` and `trunk`.

## Routing rules to preserve

Walking speed is 1.35 meters per second. Fastest route minimizes `length / 1.35`.

Safety-focused cost is walking time times `1 + mix * penalty`. Penalty uses only documented data:

| Factor | Weight | Nearby if within |
| --- | --- | --- |
| Streetlights | 0.40 | 28 m |
| Open public places | 0.30 | 80 m |
| Sidewalks | 0.20 | 18 m |
| Marked crosswalks | 0.10 | 22 m |

The safety path may be at most about 30 percent longer in time. If no different path fits, both routes are the same and the explanation says so. Do not return a 0–100 safety score. Do not treat homes, warehouses, or homelessness as danger.

Edge fields stored on the graph: `length`, `travel_time`, `geometry`, `highway`, `light_count`, `light_score`, `near_sidewalk`, `near_crosswalk`, `nearby_poi_ids`.

## Prototype endpoints

These four are the real routing API. Login is not one of them. Login lives only in `mock-api`.

### `GET /api/health`

```json
{ "ok": true, "ready": true }
```

`ready` is false until the walk graph has been loaded.

### `GET /api/data-status`

```json
{
  "ready": true,
  "message": "UW walk graph ready.",
  "center": { "lat": 47.6553, "lng": -122.3035 },
  "bbox": [-122.332, 47.645, -122.28, 47.672],
  "layers": {}
}
```

`layers` includes each source from the manifest plus `coverage` and `fetched_at`. `coverage` has booleans for `walking_network`, `streetlights`, `sidewalks`, `crosswalks`, and `places`, plus `unavailable` and `notes`.

### `GET /api/places?q=odegaard`

`q` is 2 to 80 characters. Returns a list:

```json
{
  "name": "Odegaard Undergraduate Library",
  "lat": 47.65647,
  "lng": -122.31042,
  "category": "library",
  "osm_id": "way:123",
  "opening_hours": null
}
```

`503` if the cache is not loaded.

### `POST /api/routes`

```json
{
  "origin_lat": 47.6553,
  "origin_lng": -122.309,
  "dest_lat": 47.6565,
  "dest_lng": -122.3104,
  "departure_time": "2026-10-17T21:30:00-07:00"
}
```

Response:

```json
{
  "fastest": {
    "geometry": { "type": "LineString", "coordinates": [[-122.309, 47.6553]] },
    "metrics": {
      "distance_m": 280.0,
      "duration_s": 207.0,
      "duration_min": 3.5,
      "extra_minutes_vs_fastest": 0.0
    },
    "explanation": "Fastest uses the pedestrian network and estimated walking time only.",
    "factors": {
      "edge_count": 8,
      "edges_near_streetlights": 3,
      "edges_near_sidewalks": 4,
      "edges_near_marked_crosswalks": 1,
      "open_place_proximity_sum": 2,
      "streetlight_coverage_share": 0.38,
      "sidewalk_coverage_share": 0.5
    }
  },
  "safety_focused": {
    "geometry": { "type": "LineString", "coordinates": [[-122.309, 47.6553]] },
    "metrics": {
      "distance_m": 340.0,
      "duration_s": 252.0,
      "duration_min": 4.2,
      "extra_minutes_vs_fastest": 0.7
    },
    "explanation": "Safety-focused prefers documented lights, open places, sidewalks, and crosswalks. This is not a crime forecast.",
    "factors": { "safety_mix": 4.0 }
  },
  "routes_identical": false,
  "data_coverage": {
    "walking_network": true,
    "streetlights": true,
    "sidewalks": true,
    "crosswalks": true,
    "places": true,
    "unavailable": [],
    "notes": []
  },
  "provenance": [
    {
      "layer": "walking_network",
      "source": "OpenStreetMap via OSMnx (network_type=walk)",
      "fetched_at": "2026-10-17T06:23:58+00:00",
      "ok": true,
      "feature_count": 23474,
      "error": null
    }
  ],
  "departure_time_local": "2026-10-17T21:30:00-07:00"
}
```

`safety_focused.factors` also includes the same count fields as `fastest`, plus `safety_mix`. Coordinates are `[longitude, latitude]` along real walk edges, not a straight line.

`400` when the points are too far from the network, are the same snapped node, or have no connected walk path. `422` when coordinates are outside the allowed range. `503` when the cache is missing.

## What the mock adds

`PathWise/mock-api` serves the same four paths with hardcoded geometry, plus:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `GET /api/auth/me`

Keep those paths. When the real router is ready, replace only the body of `POST /api/routes`, `GET /api/places`, and `GET /api/data-status`. Leave the JSON field names unchanged.
