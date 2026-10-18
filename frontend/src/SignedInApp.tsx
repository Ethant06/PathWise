import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";

import { dataStatus, findRoutes } from "./api";
import { BottomNav, type Tab } from "./components/BottomNav";
import { isEnabled } from "./config/features";
import { CheckInScreen } from "./features/feedback/CheckInScreen";
import { cleanFeedback, feedbackService } from "./features/feedback/service";
import type { WalkFeedback } from "./features/feedback/types";
import { ProfileExtras } from "./features/ProfileExtras";
import { placeAsHit, placeTitle, walkEndpoint } from "./features/savedPlaces/labels";
import { SavedPlaceChips } from "./features/savedPlaces/SavedPlaceChips";
import { SavedPlacesScreen } from "./features/savedPlaces/SavedPlacesScreen";
import { savedPlaces } from "./features/savedPlaces/service";
import type { SavedPlace } from "./features/savedPlaces/types";
import { errorText } from "./features/shared/collection";
import { updateCachedWalk, walks, walksService } from "./features/walks/service";
import type { NewWalk, Walk, WalkEndpoint } from "./features/walks/types";
import { WalkDetailScreen } from "./features/walks/WalkDetailScreen";
import { WalksScreen } from "./features/walks/WalksScreen";
import { AccountScreen } from "./screens/AccountScreen";
import { HomeScreen, type Origin } from "./screens/HomeScreen";
import { NavigationScreen } from "./screens/NavigationScreen";
import { PlacesScreen } from "./screens/PlacesScreen";
import { RoutesScreen } from "./screens/RoutesScreen";
import { useTheme } from "./theme";
import type { DataStatusResponse, PlaceHit, RouteResponse, UserPublic } from "./types";

type Choice = "fastest" | "safety_focused";
type WalkEnds = { origin: WalkEndpoint; destination: WalkEndpoint };
type HomeView =
  | { name: "home" }
  | { name: "places" }
  | { name: "savedPlaces" }
  | { name: "routes"; routes: RouteResponse }
  | { name: "navigate"; routes: RouteResponse; choice: Choice; ends: WalkEnds }
  | { name: "checkin"; walk: NewWalk; saveError: string | null };
type WalksView = { name: "list" } | { name: "detail"; walkId: string };
type ProfileView = { name: "account" } | { name: "savedPlaces" };

const SAVED_PREFIX = "saved:";

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
  const [walksView, setWalksView] = useState<WalksView>({ name: "list" });
  const [profileView, setProfileView] = useState<ProfileView>({ name: "account" });
  const [status, setStatus] = useState<DataStatusResponse | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [origin, setOrigin] = useState<Origin>({ status: "locating" });
  const [destination, setDestination] = useState<PlaceHit | null>(null);
  const [startPlaceId, setStartPlaceId] = useState<string | null>(null);
  const [finding, setFinding] = useState(false);
  const [findError, setFindError] = useState<string | null>(null);
  const walkSave = useRef<Promise<Walk> | null>(null);
  const places = savedPlaces.use().items;

  // A saved place chosen as the start replaces the GPS position for routing.
  const startPlace = places.find((place) => place.id === startPlaceId) ?? null;
  const routeOrigin: Origin = startPlace
    ? { status: "ready", latitude: startPlace.lat, longitude: startPlace.lng }
    : origin;
  const destinationPlaceId = destination?.osm_id.startsWith(SAVED_PREFIX)
    ? destination.osm_id.slice(SAVED_PREFIX.length)
    : null;

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
    if (routeOrigin.status !== "ready" || !destination) return;
    setFinding(true);
    setFindError(null);
    try {
      const routes = await findRoutes({
        origin_lat: routeOrigin.latitude,
        origin_lng: routeOrigin.longitude,
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

  function goTo(place: SavedPlace) {
    setDestination(placeAsHit(place));
    setFindError(null);
    setTab("home");
    setView({ name: "home" });
  }

  function startFrom(place: SavedPlace) {
    setStartPlaceId(place.id);
    setFindError(null);
    setTab("home");
    setView({ name: "home" });
  }

  /** Labels the walk's ends with saved places so history can group commutes. */
  function walkEnds(): WalkEnds | null {
    if (routeOrigin.status !== "ready" || !destination) return null;
    const start: WalkEndpoint = startPlace
      ? { label: placeTitle(startPlace), place_id: startPlace.id, lat: startPlace.lat, lng: startPlace.lng }
      : walkEndpoint(routeOrigin.latitude, routeOrigin.longitude, places);
    const saved = destinationPlaceId ? places.find((place) => place.id === destinationPlaceId) : undefined;
    const end: WalkEndpoint = saved
      ? { label: placeTitle(saved), place_id: saved.id, lat: saved.lat, lng: saved.lng }
      : walkEndpoint(destination.lat, destination.lng, places, destination.name);
    return { origin: start, destination: end };
  }

  function saveWalk(walk: NewWalk): Promise<Walk> {
    const promise = walksService()
      .create(walk)
      .then((saved) => {
        walks.set([saved, ...walks.get().items.filter((item) => item.id !== saved.id)]);
        return saved;
      });
    walkSave.current = promise;
    return promise;
  }

  function walkEnded(walk: NewWalk) {
    if (!isEnabled("routeHistory")) {
      setView({ name: "home" });
      return;
    }
    walkSave.current = null;
    const showCheckIn = isEnabled("walkFeedback");
    setView(showCheckIn ? { name: "checkin", walk, saveError: null } : { name: "home" });
    saveWalk(walk).catch((e: unknown) => {
      const message = `This walk wasn't saved to history yet: ${errorText(e, "unknown error")}`;
      setView((current) => (current.name === "checkin" && current.walk === walk ? { ...current, saveError: message } : current));
    });
  }

  async function submitCheckIn(walk: NewWalk, feedback: WalkFeedback) {
    const cleaned = cleanFeedback(feedback);
    let saved: Walk;
    try {
      saved = await (walkSave.current ?? saveWalk(walk));
    } catch {
      // The first save failed; Save on the check-in retries it.
      saved = await saveWalk(walk);
    }
    await feedbackService().send(saved.id, cleaned);
    updateCachedWalk({ ...saved, feedback: cleaned });
    setView({ name: "home" });
  }

  function savedPlacesScreen(onBack: () => void) {
    return <SavedPlacesScreen onBack={onBack} onGoTo={goTo} onStartFrom={startFrom} />;
  }

  let content;
  if (tab === "profile") {
    content =
      profileView.name === "savedPlaces" ? (
        savedPlacesScreen(() => setProfileView({ name: "account" }))
      ) : (
        <AccountScreen onLogOut={onLogOut} user={user}>
          <ProfileExtras onSavedPlaces={() => setProfileView({ name: "savedPlaces" })} />
        </AccountScreen>
      );
  } else if (tab === "walks") {
    content =
      walksView.name === "detail" ? (
        <WalkDetailScreen onBack={() => setWalksView({ name: "list" })} walkId={walksView.walkId} />
      ) : (
        <WalksScreen onOpen={(walk) => setWalksView({ name: "detail", walkId: walk.id })} />
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
  } else if (view.name === "savedPlaces") {
    content = savedPlacesScreen(() => setView({ name: "home" }));
  } else if (view.name === "checkin") {
    const walk = view.walk;
    content = (
      <CheckInScreen
        onSkip={() => setView({ name: "home" })}
        onSubmit={(feedback) => submitCheckIn(walk, feedback)}
        saveError={view.saveError}
        walk={walk}
      />
    );
  } else if (view.name === "navigate" && destination) {
    content = (
      <NavigationScreen
        choice={view.choice}
        destination={destination}
        onStop={(routes) => setView({ name: "routes", routes })}
        routes={view.routes}
        walk={isEnabled("walkSession") ? { ...view.ends, onEnded: walkEnded } : undefined}
        walkerName={user.name}
      />
    );
  } else if (view.name === "routes" && routeOrigin.status === "ready" && destination) {
    content = (
      <RoutesScreen
        destination={destination}
        onBack={() => setView({ name: "home" })}
        origin={{ latitude: routeOrigin.latitude, longitude: routeOrigin.longitude }}
        routes={view.routes}
        onStart={(choice) => {
          const ends = walkEnds();
          if (ends) setView({ name: "navigate", routes: view.routes, choice, ends });
        }}
      />
    );
  } else {
    content = (
      <HomeScreen
        belowLocations={
          isEnabled("savedPlaces") ? (
            <SavedPlaceChips
              destinationId={destinationPlaceId}
              onGoTo={goTo}
              onManage={() => setView({ name: "savedPlaces" })}
              onStartFrom={startFrom}
              startId={startPlace?.id ?? null}
            />
          ) : undefined
        }
        destination={destination}
        findError={findError}
        finding={finding}
        onFind={find}
        onPickDestination={() => setView({ name: "places" })}
        onRetryLocation={() => {
          // Tapping "Starting from" goes back to the current location.
          setStartPlaceId(null);
          setOrigin({ status: "locating" });
          locate().then(setOrigin);
        }}
        origin={routeOrigin}
        originName={startPlace ? placeTitle(startPlace) : undefined}
        status={status}
        statusError={statusError}
      />
    );
  }

  const hideNav = tab === "home" && (view.name === "navigate" || view.name === "checkin");
  return (
    <View style={{ backgroundColor: theme.colors.background, flex: 1 }}>
      <View style={{ flex: 1 }}>{content}</View>
      {!hideNav && <BottomNav onChange={setTab} tab={tab} />}
    </View>
  );
}
