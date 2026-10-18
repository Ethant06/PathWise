import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { dataStatus, findRoutes } from "./api";
import { BottomNav, type Tab } from "./components/BottomNav";
import { AccountScreen } from "./screens/AccountScreen";
import { HomeScreen, type Origin } from "./screens/HomeScreen";
import { NavigationScreen } from "./screens/NavigationScreen";
import { PlacesScreen } from "./screens/PlacesScreen";
import { RoutesScreen } from "./screens/RoutesScreen";
import { WalkBuddyScreen } from "./screens/WalkBuddyScreen";
import { useTheme } from "./theme";
import type { DataStatusResponse, PlaceHit, RouteResponse, UserPublic } from "./types";

type Choice = "fastest" | "safety_focused";
type HomeView =
  | { name: "home" }
  | { name: "places" }
  | { name: "routes"; routes: RouteResponse }
  | { name: "navigate"; routes: RouteResponse; choice: Choice }
  | { name: "buddy" };

function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

/** Asks for location permission, then reads the current position. */
async function locate(): Promise<Origin> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return { status: "denied" };
    const position = await Location.getCurrentPositionAsync();
    return { status: "ready", latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch {
    return { status: "error" };
  }
}

export function SignedInApp({ user, onLogOut }: { user: UserPublic; onLogOut: () => void }) {
  const theme = useTheme();
  const [tab, setTab] = useState<Tab>("home");
  const [view, setView] = useState<HomeView>({ name: "home" });
  const [status, setStatus] = useState<DataStatusResponse | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [origin, setOrigin] = useState<Origin>({ status: "locating" });
  const [destination, setDestination] = useState<PlaceHit | null>(null);
  const [finding, setFinding] = useState(false);
  const [findError, setFindError] = useState<string | null>(null);

  useEffect(() => {
    dataStatus()
      .then(setStatus)
      .catch((e: unknown) => setStatusError(errorMessage(e, "Could not load the map.")));
  }, []);

  useEffect(() => {
    let cancelled = false;
    locate().then((next) => {
      if (!cancelled) setOrigin(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function find() {
    if (origin.status !== "ready" || !destination) return;
    setFinding(true);
    setFindError(null);
    try {
      const routes = await findRoutes({
        origin_lat: origin.latitude,
        origin_lng: origin.longitude,
        dest_lat: destination.lat,
        dest_lng: destination.lng,
        departure_time: new Date().toISOString(),
      });
      setView({ name: "routes", routes });
    } catch (e) {
      setFindError(errorMessage(e, "Could not find routes."));
    } finally {
      setFinding(false);
    }
  }

  let content;
  if (tab === "profile") {
    content = <AccountScreen onLogOut={onLogOut} user={user} />;
  } else if (view.name === "buddy" && origin.status === "ready") {
    content = (
      <WalkBuddyScreen
        latitude={origin.latitude}
        longitude={origin.longitude}
        onBack={() => setView({ name: "home" })}
      />
    );
  } else if (view.name === "places") {
    content = (
      <PlacesScreen
        onBack={() => setView({ name: "home" })}
        onSelect={(place) => {
          setDestination(place);
          setFindError(null);
          setView({ name: "home" });
        }}
      />
    );
  } else if (view.name === "navigate" && destination) {
    content = (
        <NavigationScreen
          choice={view.choice}
          destination={destination}
          onStop={(routes) => setView({ name: "routes", routes })}
          routes={view.routes}
          walkerName={user.name}
        />
    );
  } else if (view.name === "routes" && origin.status === "ready" && destination) {
    content = (
      <RoutesScreen
        destination={destination}
        onBack={() => setView({ name: "home" })}
        origin={{ latitude: origin.latitude, longitude: origin.longitude }}
        routes={view.routes}
        onStart={(choice) => setView({ name: "navigate", routes: view.routes, choice })}
      />
    );
  } else {
    content = (
      <HomeScreen
        destination={destination}
        findError={findError}
        finding={finding}
        onAskBuddy={() => setView({ name: "buddy" })}
        onFind={find}
        onPickDestination={() => setView({ name: "places" })}
        onRetryLocation={() => {
          setOrigin({ status: "locating" });
          locate().then(setOrigin);
        }}
        origin={origin}
        status={status}
        statusError={statusError}
      />
    );
  }

  return (
    <View style={{ backgroundColor: theme.colors.background, flex: 1 }}>
      <View style={{ flex: 1 }}>{content}</View>
      {view.name !== "navigate" && <BottomNav onChange={setTab} tab={tab} />}
    </View>
  );
}
