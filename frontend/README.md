# PathWise frontend

Blank Expo app (TypeScript). The map screen calls `POST /api/routes` and draws the safety-focused walk.

The map runs in Expo Go on a phone or in the Android emulator. It does not render in the browser.

## Setup

Use Node 22.13+, 24.3+, or 26+. This repo's `.nvmrc` is the version used to create the app.

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npx expo start --tunnel
```

Edit `.env` before you start Expo. `EXPO_PUBLIC_API_URL` is the only setting. `.env` stays off Git. `.env.example` is the shared template.

| Where the app runs | URL |
| --- | --- |
| Android emulator | `http://10.0.2.2:8000` |
| iOS Simulator on a Mac | `http://localhost:8000` |
| iPhone or a real Android phone | `http://<laptop IPv4>:8000` |

On Windows, find the IPv4 address with `ipconfig`. The phone and laptop must be on the same network. Campus Wi-Fi often blocks that, so use the phone's hotspot for the laptop if the request fails. `--tunnel` only delivers the JavaScript bundle. It does not publish the API.

Start the mock API so the phone can reach it:

```powershell
cd mock-api
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

`--host 0.0.0.0` is what lets another device connect. On an iPhone, install Expo Go, run `npx expo start --tunnel`, and scan the QR code with the Camera app.

## Code map

- `App.tsx` draws a dark UW map from Suzzallo Library to The Ave and a **Find safest route** button.
- `src/api.ts` is the only file that calls the backend. It sends the ngrok warning header so a later ngrok URL still works.
- `src/types.ts` matches `POST /api/routes` in `backend/app/schemas/routes.py` and `mock-api/app/schemas/routes.py`.

Leave those response fields aligned with the backend. If a field changes, update `src/types.ts` in the same change.
