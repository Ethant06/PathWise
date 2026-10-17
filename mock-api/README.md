# PathWise mock API

Standalone FastAPI server for parallel work. Every response is hardcoded. The JSON shape matches the PathWise prototype, so a React Native app can be designed against Swagger now and keep working when the real router replaces `app/mocks/`.

This folder is meant to be its own git repository. It does not import the prototype backend.

## Contract

| Method | Path | File |
| --- | --- | --- |
| POST | `/api/auth/register` | `app/routers/auth.py` |
| POST | `/api/auth/login` | `app/routers/auth.py` |
| POST | `/api/auth/google` | `app/routers/auth.py` |
| GET | `/api/auth/me` | `app/routers/auth.py` |
| GET | `/api/health` | `app/routers/health.py` |
| GET | `/api/data-status` | `app/routers/status.py` |
| GET | `/api/places?q=odegaard` | `app/routers/places.py` |
| POST | `/api/routes` | `app/routers/routes.py` |

`POST /api/routes` takes an origin, a destination, and a departure time. It returns **two** routes, `fastest` and `safety_focused`, each with a GeoJSON `LineString`, distance, minutes, and a short explanation. There is no 0–100 safety score and no user-facing weight slider.

Map, search, and routing stay public so the walking screen can be built without a token. Accounts are separate.

Register and login store a user with SQLAlchemy and return a JWT from PyJWT. Passwords are hashed with pwdlib. `POST /api/auth/google` takes `{ "id_token": "mock-google-token" }` and signs in a demo student. It does not call Google yet. Send that token as `Authorization: Bearer <access_token>` to `GET /api/auth/me`.

The default database is a local SQLite file, created on startup. Postgres is the same models with:

```text
DATABASE_URL=postgresql+psycopg://pathwise:pathwise@localhost:5432/pathwise
alembic upgrade head
```

Schemas live in `app/schemas/`. Fake routes and places live in `app/mocks/`. Leave the response models alone unless you and the UI both agree to change them.

## Run

```powershell
cd mock-api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

If the prototype API is already using port 8000, start this one on 8010 instead.

Swagger UI: http://127.0.0.1:8000/docs

OpenAPI JSON: http://127.0.0.1:8000/openapi.json

## TypeScript types for the React Native app

With this server running:

```powershell
npx --yes openapi-typescript http://127.0.0.1:8000/openapi.json -o api-types.ts
```

Commit `api-types.ts` in the app repo. Regenerate it only when a schema file changes.

## Sample route body

```json
{
  "origin_lat": 47.6553,
  "origin_lng": -122.309,
  "dest_lat": 47.6565,
  "dest_lng": -122.3104,
  "departure_time": "2026-10-17T21:30:00-07:00"
}
```

Coordinates are `[longitude, latitude]` inside `geometry.coordinates`.

## Sample account

```json
{ "name": "Ada Lovelace", "email": "ada@uw.edu", "password": "correct-horse" }
```

Google demo body: `{ "id_token": "mock-google-token" }`.

## Phone and ngrok

CORS allows any origin so Expo can call the API. From the `mock-api` folder, after uvicorn is up:

```powershell
ngrok http 8000
```

Point the app at `https://<your-subdomain>.ngrok-free.app`.
