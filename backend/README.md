# PathWise API

Live server for the same contract as `mock-api`. Register, login, and Google sign-in store users and return a JWT. `GET /api/data-status` reads `data/cache/manifest.json` and `data/cache/walk_graph.pkl`. `GET /api/places` searches `data/cache/pois.geojson`. `POST /api/routes` walks `data/cache/walk_graph.pkl` and returns `fastest` and `safety_focused` with the same fields as the mock. Build that cache with `python scripts/ingest.py`. The download takes several minutes.

Keep `app/schemas/` aligned with `mock-api/app/schemas/`. The frontend depends on those fields.

## Run

Use port 8020 so the mock server can stay on 8000 for the app.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python scripts/ingest.py
uvicorn app.main:app --reload --port 8020
```

Swagger UI: http://127.0.0.1:8020/docs

The default database is `pathwise.db` in this folder, created on startup. It is separate from the mock API database.

Postgres uses the same models:

```text
DATABASE_URL=postgresql+psycopg://pathwise:pathwise@localhost:5432/pathwise
alembic upgrade head
```
