# PathWise

Walk-home companion for the University of Washington. Pick a destination and compare the fastest pedestrian route with a safer one that weighs streetlights, open places, sidewalks, and marked crosswalks. The safer walk stays within 30% of the fastest time. A friend can opt in over iMessage and get a text if you stop, leave the path, or arrive.

Coverage is campus plus the University District and nearby north Seattle (Roosevelt, Wallingford, Fremont, Eastlake, Montlake, Ravenna, U-Village).

## Requirements

- Node 24
- Python 3.13
- Expo Go for SDK 57 on a phone, on the same network as the laptop

## API

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python scripts/ingest.py
uvicorn app.main:app --reload --host 0.0.0.0 --port 8020
```

`ingest.py` downloads the walk graph and takes several minutes. The API creates `backend/pathwise.db` on startup. Docs: http://127.0.0.1:8020/docs

Optional keys in `backend/.env` (never commit this file):

| Key | Used for |
| --- | --- |
| `GOOGLE_CLIENT_IDS` | Google sign-in |
| `PHOTON_API_KEY`, `PHOTON_PROJECT_ID`, `PHOTON_AGENT_HANDLE` | Watcher texts |
| `OPENAI_API_KEY` | Ask Walk Buddy |

Email sign-up works with the defaults. Restart uvicorn after changing `.env`.

## App

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm start
```

In `frontend/.env`, point the phone at this laptop's live API (port **8020**, not 8000):

```text
EXPO_PUBLIC_API_URL=http://<laptop IPv4>:8020
```

`ipconfig` shows the IPv4 address. Restart Expo after editing `.env`. Scan the QR code in Expo Go. The map does not render in a browser.

For Google sign-in, also set `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`. In Expo Go the iOS bundle ID is `host.exp.Exponent`.

## Watcher texts

In the Photon project, add the friend's iMessage number under iMessage assignments and send them the number Photon assigns to that phone. They text that number once and can send their name. On the walk, choose them under **Choose who is watching**. Alerts reply in that thread.

## Walk Buddy (AI)

Walk Buddy is the app's AI feature. This section describes the first version, merged in PR #12.

- **Where:** **Ask Walk Buddy** on the Home screen opens a text box. It is enabled once the phone has a GPS fix.
- **Request:** the app sends `POST /api/walk-buddy` with `{ "question", "lat", "lng" }`, using the phone's current GPS position. The endpoint takes no login token, like place search.
- **Model:** `backend/app/buddy.py` calls OpenAI's Chat Completions API with `gpt-4o-mini`. The system prompt is one sentence: "You suggest walking routes around the University of Washington campus." The user message is `I'm at <lat>, <lng>. <question>`.
- **Data sent to OpenAI:** the question text as typed and the exact coordinates.
- **Answer:** the model's text is returned as `{ "answer" }` and shown on the screen as-is. It does not use PathWise's own route, lighting, or place data.
- **Setup:** set `OPENAI_API_KEY` in `backend/.env`. Without it the endpoint returns `503` with "Walk Buddy needs an OpenAI API key on the server."

## Mock API

`mock-api/` is a stand-in on port 8000 with the same route and place fields. The phone app above uses `backend/` on port 8020.
