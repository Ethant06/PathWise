# PathWise frontend

Blank Expo app. The screen in `App.tsx` is only a title. Sign-in, the home map, and the places directory are not built yet.

`react-native-maps` and `expo-location` are already installed. No screen uses them.

## Run

Node is recorded in the repo root `.nvmrc` (`v24.11.0`).

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npx expo start
```

`.env` is personal and is not in Git. Restart Expo after changing it.

| Where the app runs | `EXPO_PUBLIC_API_URL` |
| --- | --- |
| Android emulator | `http://10.0.2.2:8000` |
| iOS Simulator on a Mac | `http://localhost:8000` |
| A real phone | `http://<laptop IPv4>:8000` |

On Windows, `ipconfig` shows the IPv4 address. The phone and laptop need a shared network. Campus Wi-Fi often blocks that, so use the phone hotspot if requests fail. `npx expo start --tunnel` only delivers the app bundle. It does not publish the API.

Install Expo Go, then scan the QR code. The map will not render in the browser.

Start the mock API in another terminal so the phone can reach it:

```powershell
cd mock-api
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## What to build

Use `src/api.ts` for every request. The response shapes are `src/types.ts`, copied from `mock-api/app/schemas`. If a field is missing, ask before adding one.

| Screen | Calls |
| --- | --- |
| Sign up | `register` |
| Log in | `login`, `loginWithGoogle` (`id_token` is `mock-google-token` until Google is connected) |
| Account | `currentUser` with the saved `access_token` |
| Home map | `dataStatus`, `findRoutes` |
| Places directory | `searchPlaces` |

Place search and routing do not send the token. Save `access_token` on the device after register, login, or Google.

`findRoutes` returns `fastest` and `safety_focused`. Each `geometry.coordinates` list is `[longitude, latitude]`. There is no safety score from 0 to 100.
