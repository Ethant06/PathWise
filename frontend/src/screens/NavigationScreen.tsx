import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

import { findRoutes, sendWatchTest, startWatch, updateWatch, type WatchMessage } from "../api";
import { PrimaryButton } from "../components/PrimaryButton";
import { toLatLngs } from "../format";
import { ARRIVE_METERS, distanceMeters, distanceToPath, OFF_ROUTE_METERS, type LatLng } from "../geo";
import { colors } from "../theme";
import type { PlaceHit, RouteResponse } from "../types";

type Choice = "fastest" | "safety_focused";

const REROUTE_WAIT_MS = 8_000;
const FOLLOW_DELTA = 0.004;

export function NavigationScreen({
  choice,
  destination,
  routes,
  walkerName,
  onStop,
}: {
  choice: Choice;
  destination: PlaceHit;
  routes: RouteResponse;
  walkerName: string;
  onStop: (routes: RouteResponse) => void;
}) {
  const mapRef = useRef<MapView>(null);
  const routesRef = useRef(routes);
  const rerouting = useRef(false);
  const lastReroute = useRef(0);
  const [activeRoutes, setActiveRoutes] = useState(routes);
  const [here, setHere] = useState<LatLng | null>(null);
  const [status, setStatus] = useState("Following your location");
  const [arrived, setArrived] = useState(false);
  const [watcherName, setWatcherName] = useState(walkerName);
  const [watchId, setWatchId] = useState<string | null>(null);
  const [watchError, setWatchError] = useState<string | null>(null);
  const [texts, setTexts] = useState<WatchMessage[]>([]);
  const watchIdRef = useRef<string | null>(null);
  const arrivedRef = useRef(false);
  const hereRef = useRef<LatLng | null>(null);

  const selected = choice === "fastest" ? activeRoutes.fastest : activeRoutes.safety_focused;
  const path = toLatLngs(selected.geometry);
  const destinationCoord = { latitude: destination.lat, longitude: destination.lng };
  const lineColor = choice === "fastest" ? colors.blue : colors.teal;

  useEffect(() => {
    routesRef.current = activeRoutes;
  }, [activeRoutes]);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    async function follow() {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        if (!cancelled) setStatus("Allow location access to follow the route.");
        return;
      }
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          distanceInterval: 5,
          timeInterval: 2000,
        },
        (position) => {
          if (cancelled) return;
          const next = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setHere(next);
          hereRef.current = next;
          const current = routesRef.current;
          const line = toLatLngs(
            choice === "fastest" ? current.fastest.geometry : current.safety_focused.geometry,
          );
          const watchIdNow = watchIdRef.current;
          if (watchIdNow && !arrivedRef.current) {
            const offRoute = distanceToPath(next, line) > OFF_ROUTE_METERS;
            const atDestination =
              distanceMeters(next, { latitude: destination.lat, longitude: destination.lng }) <= ARRIVE_METERS;
            void reportWatch(watchIdNow, next, offRoute && !atDestination, atDestination);
          }
          mapRef.current?.animateToRegion(
            { ...next, latitudeDelta: FOLLOW_DELTA, longitudeDelta: FOLLOW_DELTA },
            400,
          );
          if (distanceMeters(next, { latitude: destination.lat, longitude: destination.lng }) <= ARRIVE_METERS) {
            arrivedRef.current = true;
            setArrived(true);
            setStatus("You arrived");
            return;
          }
          if (distanceToPath(next, line) <= OFF_ROUTE_METERS) {
            setStatus("Following your location");
            return;
          }
          const now = Date.now();
          if (rerouting.current || now - lastReroute.current < REROUTE_WAIT_MS) return;
          rerouting.current = true;
          lastReroute.current = now;
          setStatus("Recalculating route");
          findRoutes({
            origin_lat: next.latitude,
            origin_lng: next.longitude,
            dest_lat: destination.lat,
            dest_lng: destination.lng,
            departure_time: new Date().toISOString(),
          })
            .then((fresh) => {
              if (cancelled) return;
              setActiveRoutes(fresh);
              setStatus("Following your location");
            })
            .catch((error: unknown) => {
              if (cancelled) return;
              const message = error instanceof Error ? error.message : "";
              if (message.toLowerCase().includes("same")) {
                arrivedRef.current = true;
                setArrived(true);
                setStatus("You arrived");
                return;
              }
              setStatus(message || "Could not recalculate the route.");
            })
            .finally(() => {
              rerouting.current = false;
            });
        },
      );
    }

    follow();
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [choice, destination.lat, destination.lng]);

  useEffect(() => {
    if (!watchId) return;
    const timer = setInterval(() => {
      const id = watchIdRef.current;
      const next = hereRef.current;
      if (!id || !next || arrivedRef.current) return;
      const current = routesRef.current;
      const line = toLatLngs(choice === "fastest" ? current.fastest.geometry : current.safety_focused.geometry);
      const atDestination =
        distanceMeters(next, { latitude: destination.lat, longitude: destination.lng }) <= ARRIVE_METERS;
      const offRoute = !atDestination && distanceToPath(next, line) > OFF_ROUTE_METERS;
      void reportWatch(id, next, offRoute, atDestination);
    }, 5_000);
    return () => clearInterval(timer);
  }, [watchId, choice, destination.lat, destination.lng]);

  async function reportWatch(id: string, next: LatLng, offRoute: boolean, atDestination: boolean) {
    let street: string | null = null;
    try {
      const places = await Location.reverseGeocodeAsync(next);
      street = places[0]?.street || places[0]?.name || null;
    } catch {
      street = null;
    }
    try {
      const session = await updateWatch(id, {
        off_route: offRoute,
        arrived: atDestination,
        street,
        lat: next.latitude,
        lng: next.longitude,
      });
      setTexts(session.messages);
      if (session.notice) setWatchError(session.notice);
    } catch {
      // A missed ping can be sent again on the next location update.
    }
  }

  async function sendTest() {
    setWatchError(null);
    try {
      const result = await sendWatchTest();
      if (result.notice) {
        setWatchError(result.notice);
        return;
      }
      setTexts([{ kind: "still", text: `Sent to your iPhone, in the thread with ${result.line}.`, sent_at: new Date().toISOString() }]);
    } catch (error) {
      setWatchError(error instanceof Error ? error.message : "Could not send the test text.");
    }
  }

  async function beginWatch() {
    const name = watcherName.trim();
    if (!name) {
      setWatchError("Enter the name of the person watching.");
      return;
    }
    setWatchError(null);
    try {
      const session = await startWatch({
        walker_name: walkerName.trim() || "Someone",
        watcher_name: name,
        destination_name: destination.name,
      });
      watchIdRef.current = session.id;
      setWatchId(session.id);
      setTexts(session.messages);
      if (session.notice) setWatchError(session.notice);
    } catch (error) {
      setWatchError(error instanceof Error ? error.message : "Could not start the watch.");
    }
  }

  return (
    <View style={styles.screen}>
      <MapView
        initialRegion={{
          latitude: here?.latitude ?? path[0]?.latitude ?? destination.lat,
          longitude: here?.longitude ?? path[0]?.longitude ?? destination.lng,
          latitudeDelta: FOLLOW_DELTA,
          longitudeDelta: FOLLOW_DELTA,
        }}
        ref={mapRef}
        showsUserLocation
        style={styles.map}
      >
        {path.length > 1 && <Polyline coordinates={path} strokeColor={lineColor} strokeWidth={6} />}
        <Marker coordinate={destinationCoord} pinColor={colors.teal} title={destination.name} />
      </MapView>

      <View pointerEvents="none" style={styles.statusCard}>
        <Text style={styles.eyebrow}>{arrived ? "Arrived" : "Navigating"}</Text>
        <Text style={styles.title}>{destination.name}</Text>
        <Text style={styles.status}>{status}</Text>
      </View>

      <View style={styles.stop}>
        {watchId ? (
          <View style={styles.watchLive}>
            <Text style={styles.watchLabel}>{watcherName.trim()} is watching</Text>
            <Text style={styles.watchText}>
              {texts.length > 0
                ? texts[texts.length - 1].text
                : "No text yet. They get an iMessage if you stop for 20 seconds, leave the path, or arrive."}
            </Text>
          </View>
        ) : (
          <View style={styles.watchSetup}>
            <Text style={styles.watchText}>
              Alerts go back to the iPhone that texted the PathWise number. Testing alone, that is this phone.
            </Text>
            <Pressable onPress={() => void sendTest()} style={styles.watchButton}>
              <Text style={styles.watchButtonLabel}>Send a test text</Text>
            </Pressable>
            <View style={styles.watchForm}>
              <TextInput
                onChangeText={setWatcherName}
                placeholder="Name on the alert"
                placeholderTextColor={colors.mutedLight}
                style={styles.watchInput}
                value={watcherName}
              />
              <Pressable onPress={() => void beginWatch()} style={styles.watchButton}>
                <Text style={styles.watchButtonLabel}>Watch this walk</Text>
              </Pressable>
            </View>
          </View>
        )}
        {watchError ? <Text style={styles.watchError}>{watchError}</Text> : null}
        <PrimaryButton label="Stop Navigation" onPress={() => onStop(activeRoutes)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.surface,
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0,
  },
  map: { flex: 1 },
  statusCard: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    left: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    position: "absolute",
    right: 16,
    top: (Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0) + 16,
  },
  eyebrow: {
    color: colors.teal,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: { color: colors.ink, fontSize: 18, fontWeight: "700", marginTop: 2 },
  status: { color: colors.muted, fontSize: 12, marginTop: 4 },
  stop: {
    backgroundColor: colors.surface,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    gap: 10,
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  watchSetup: { gap: 8 },
  watchForm: { alignItems: "center", flexDirection: "row", gap: 8 },
  watchInput: {
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    height: 44,
    paddingHorizontal: 12,
  },
  watchButton: {
    backgroundColor: colors.tealSoft,
    borderRadius: 12,
    justifyContent: "center",
    paddingHorizontal: 12,
    height: 44,
  },
  watchButtonLabel: { color: colors.teal, fontSize: 13, fontWeight: "700" },
  watchLive: { gap: 2 },
  watchLabel: { color: colors.teal, fontSize: 12, fontWeight: "700" },
  watchText: { color: colors.ink, fontSize: 13 },
  watchError: { color: colors.danger, fontSize: 12, fontWeight: "600" },
});
