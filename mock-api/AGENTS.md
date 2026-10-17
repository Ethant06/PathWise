# Frontend agent instructions

Build the React or React Native client from this folder only. Do not invent endpoints.

## Read these files first

1. `openapi.json` is the full contract.
2. `api-types.ts` is that contract as TypeScript. Import it. Do not hand-write duplicate types.
3. `app/schemas/` is the source of every request and response field.
4. `app/routers/` is one file per endpoint group.
5. `app/mocks/` shows example JSON for routes and places.

## Endpoints

- `POST /api/auth/register` body: name, email, password. Returns `access_token` and `user`.
- `POST /api/auth/login` body: email, password. Returns the same token shape.
- `POST /api/auth/google` body: `{ "id_token": "mock-google-token" }`. Returns the same token shape.
- `GET /api/auth/me` header: `Authorization: Bearer <access_token>`.
- `GET /api/health`
- `GET /api/data-status`
- `GET /api/places?q=`
- `POST /api/routes` body: origin_lat, origin_lng, dest_lat, dest_lng, departure_time. Returns `fastest` and `safety_focused`. Each has a GeoJSON LineString in `[longitude, latitude]` order, plus distance, minutes, and explanation.

Map search and routing do not require a token. There is no safety score from 0 to 100.

## Base URL

Local mock server: `http://127.0.0.1:8010`

Do not change `app/schemas/` while building the UI. If a field is missing, stop and ask rather than guessing.
