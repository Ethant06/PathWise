# PathWise frontend guide

Give this file to the frontend agent. Build a React Native app (Expo) for walking routes at the University of Washington. Use the API in this `mock-api` folder. Do not invent endpoints, fields, or a safety score.

Import types from `api-types.ts`. The source of those types is `openapi.json` and `app/schemas/`. Example JSON is in `app/mocks/`.

Base URL while developing: `http://127.0.0.1:8000`

The API does not send a map. The app draws the map.

## What the app must provide itself

These are not PathWise endpoints.

| Need | Use |
| --- | --- |
| Map | MapLibre in the React Native app. Center it at latitude `47.6553`, longitude `-122.3035` |
| Map tiles | OpenFreeMap style `https://tiles.openfreemap.org/styles/liberty` |
| Attribution | Show “© OpenStreetMap contributors” and “OpenFreeMap” on the map |
| User location | The phone’s geolocation. This only works on HTTPS or localhost |
| Origin and destination pins | Stored in app state. Blue pin is origin. Red pin is destination |
| Which route is selected | App state: `fastest` or `safety_focused`. Switching does not call the server again |
| Login token | Save `access_token` on the device and send it only to `GET /api/auth/me` |

## Screens

1. Login. Email and password, a register path, and a Google button.
2. Map. Search, two pins, two route lines, minutes, distance, and one explanation.
3. The map is usable without logging in.

## Auth

All auth responses that succeed return:

```json
{
  "access_token": "jwt",
  "token_type": "bearer",
  "user": { "id": 1, "name": "Ada Lovelace", "email": "ada@uw.edu", "auth_provider": "password" }
}
```

`auth_provider` is `"password"` or `"google"`.

| Call | Body | Success | Failure |
| --- | --- | --- | --- |
| `POST /api/auth/register` | `name`, `email`, `password` (password at least 8 characters) | Token response | `400` if the email exists |
| `POST /api/auth/login` | `email`, `password` | Token response | `401` if the email or password is wrong |
| `POST /api/auth/google` | `{ "id_token": "mock-google-token" }` | Token response for the demo student | `400` if `id_token` is empty |
| `GET /api/auth/me` | Header `Authorization: Bearer <access_token>` | `{ id, name, email, auth_provider }` | `401` if the token is missing or expired |

Google sign-in is not verified with Google yet. The button should send the literal string `mock-google-token` until a real Google client ID exists. Do not add a password field on the Google path.

Store the token after register, login, or Google. Do not send it on place search or route requests.

## Map data

### `GET /api/places?q=odegaard`

`q` is required and must be at least 2 characters.

Each hit:

```json
{
  "name": "Odegaard Undergraduate Library",
  "lat": 47.65647,
  "lng": -122.31042,
  "category": "library",
  "osm_id": "way:26614445",
  "opening_hours": "Mo-Th 07:30-24:00"
}
```

`opening_hours` may be `null`. `category` may be an empty string. Show the name. Show the category only when it is non-empty. Choosing a hit sets the destination pin to `lat` and `lng`.

### `POST /api/routes`

Call this once when both pins exist, and again if either pin or the departure time changes.

Body:

```json
{
  "origin_lat": 47.6553,
  "origin_lng": -122.309,
  "dest_lat": 47.6565,
  "dest_lng": -122.3104,
  "departure_time": "2026-10-17T21:30:00-07:00"
}
```

`departure_time` is ISO 8601. Coordinates must be roughly in the Seattle area or the API returns `422`. The same point for origin and destination returns `400`.

The response contains two routes, not a list to pick from:

- `fastest`
- `safety_focused`
- `routes_identical` is true when both lines are the same path. Say so in the UI.
- `departure_time_local` is the time the server used.

Each route has:

- `geometry.type` is `"LineString"`.
- `geometry.coordinates` is a list of `[longitude, latitude]`. Longitude comes first. Draw this polyline on the map. Do not draw a straight line between the pins.
- `metrics.distance_m`
- `metrics.duration_min`
- `metrics.extra_minutes_vs_fastest` is `0` for the fastest route. For the safety-focused route, show it as added minutes when it is greater than about `0.4`.
- `explanation` is one sentence. Show the explanation for the selected route only.
- `factors` is supporting detail. Do not turn it into a score out of 100.

Color the fastest line blue (`#2563eb`) and the safety-focused line teal (`#0f766e`). Draw the selected line thicker.

`data_coverage.unavailable` lists layers that did not load. If that list is not empty, show it as “missing metadata, treated as unknown.” Do not describe those streets as unsafe.

`provenance` is source and fetch time. It is not required on the main screen.

### `GET /api/data-status`

Returns `ready`, `message`, `center` (`lat`, `lng`), `bbox` as `[west, south, east, north]`, and `layers`. Use `center` as the initial map center if you do not hardcode it. If `ready` is false, show `message`.

### `GET /api/health`

Returns `{ "ok": true, "ready": true, "mock": true }`. Use it only as a startup check.

## Do not build

- A third route mode, a weight slider, or a safety percentage.
- Turn-by-turn steps. The API does not return them. Selecting Navigate fits the map to the chosen line.
- Any endpoint that is not listed in `openapi.json`.
- Accounts stored only on the phone, except the access token.
