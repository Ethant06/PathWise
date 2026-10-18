import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

import { findRoutes, listWatchers, startWatch, updateWatch, type Watcher } from "../api";
import { PrimaryButton } from "../components/PrimaryButton";
import { formatMiles, toLatLngs } from "../format";
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
  const [street, setStreet] = useState("Finding street");
  const [arrived, setArrived] = useState(false);
  const [watcherName, setWatcherName] = useState("");
  const [picking, setPicking] = useState(false);
  const [watchers, setWatchers] = useState<Watcher[] | null>(null);
  const [line, setLine] = useState("");
  const [watchId, setWatchId] = useState<string | null>(null);
  const [watchError, setWatchError] = useState<string | null>(null);
  const watchIdRef = useRef<string | null>(null);
  const arrivedRef = useRef(false);
  const hereRef = useRef<LatLng | null>(null);
  const streetAt = useRef(0);
  const streetPoint = useRef<LatLng | null>(null);

  const selected = choice === "fastest" ? activeRoutes.fastest : activeRoutes.safety_focused;
  const path = toLatLngs(selected.geometry);
  const destinationCoord = { latitude: destination.lat, longitude: destination.lng };
  const milesAway = here ? formatMiles(distanceMeters(here, destinationCoord)) : "Locating";
  const detail = status === "Following your location" ? destination.name : status;
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
          noteStreet(next);
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
              const id = watchIdRef.current;
              if (id && !arrivedRef.current) {
                void reportWatch(id, next, false, false, true);
              }
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

  function noteStreet(next: LatLng) {
    const previous = streetPoint.current;
    const moved = previous ? distanceMeters(previous, next) : 1_000;
    if (previous && moved < 30 && Date.now() - streetAt.current < 20_000) return;
    streetAt.current = Date.now();
    streetPoint.current = next;
    Location.reverseGeocodeAsync(next)
      .then((places) => {
        const name = places[0]?.street || places[0]?.name;
        if (name) setStreet(name);
      })
      .catch(() => {});
  }

  async function reportWatch(
    id: string,
    next: LatLng,
    offRoute: boolean,
    atDestination: boolean,
    rerouted = false,
  ) {
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
        rerouted,
        street,
        lat: next.latitude,
        lng: next.longitude,
      });
      if (session.notice) setWatchError(session.notice);
    } catch {
      // A missed ping can be sent again on the next location update.
    }
  }

  async function openPicker() {
    setPicking(true);
    setWatchError(null);
    setWatchers(null);
    try {
      const result = await listWatchers();
      setLine(result.line);
      setWatchers(result.watchers);
    } catch (error) {
      setWatchers([]);
      setWatchError(error instanceof Error ? error.message : "Could not load people who texted.");
    }
  }

  async function beginWatch(watcher: Watcher) {
    setWatchError(null);
    try {
      const session = await startWatch({
        walker_name: walkerName.trim() || "Someone",
        watcher_handle: watcher.handle,
        destination_name: destination.name,
      });
      setWatcherName(session.watcher_name);
      watchIdRef.current = session.id;
      setWatchId(session.id);
      setPicking(false);
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
        <Text style={styles.street}>{street}</Text>
        <Text style={styles.miles}>{arrived ? "0.0 mi" : milesAway}</Text>
        <Text style={styles.status}>{detail}</Text>
      </View>

      <View style={styles.stop}>
        {watchId ? (
          <View style={styles.watchLive}>
            <Text style={styles.watchLabel}>{watcherName.trim()} is watching</Text>
          </View>
        ) : (
          <View style={styles.watchSetup}>
            <Text style={styles.watchText}>
              Choose someone who already texted the PathWise number. They get the alert on that iPhone.
            </Text>
            <Pressable onPress={() => void openPicker()} style={styles.watchButton}>
              <Text style={styles.watchButtonLabel}>Choose who is watching</Text>
            </Pressable>
          </View>
        )}
        {watchError ? <Text style={styles.watchError}>{watchError}</Text> : null}
        <PrimaryButton label="Stop Navigation" onPress={() => onStop(activeRoutes)} />
      </View>

      <Modal animationType="slide" onRequestClose={() => setPicking(false)} transparent visible={picking}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Who is watching?</Text>
            <Text style={styles.watchText}>
              {line
                ? `Have them text ${line} and send their name, such as Maya. Then they appear here.`
                : "Have them text the PathWise number and send their name. Then they appear here."}
            </Text>
            {watchError ? <Text style={styles.watchError}>{watchError}</Text> : null}
            <ScrollView style={styles.sheetList}>
              {watchers === null ? <Text style={styles.watchText}>Looking for people who texted…</Text> : null}
              {watchers?.length === 0 ? <Text style={styles.watchText}>No one has texted yet.</Text> : null}
              {watchers?.map((watcher) => (
                <Pressable key={watcher.handle} onPress={() => void beginWatch(watcher)} style={styles.watcherRow}>
                  <Text style={styles.watcherName}>{watcher.name}</Text>
                  {watcher.name !== watcher.phone ? <Text style={styles.watcherPhone}>{watcher.phone}</Text> : null}
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.sheetActions}>
              <Pressable onPress={() => void openPicker()} style={styles.watchButton}>
                <Text style={styles.watchButtonLabel}>Refresh</Text>
              </Pressable>
              <Pressable onPress={() => setPicking(false)} style={styles.watchButton}>
                <Text style={styles.watchButtonLabel}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    top: (Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 54) + 36,
  },
  street: { color: colors.ink, fontSize: 18, fontWeight: "700" },
  miles: { color: colors.teal, fontSize: 28, fontWeight: "700", marginTop: 2 },
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
  backdrop: {
    backgroundColor: "rgba(28,20,48,0.45)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: 10,
    maxHeight: "80%",
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  sheetTitle: { color: colors.ink, fontSize: 20, fontWeight: "700" },
  sheetList: { flexGrow: 0, maxHeight: 320 },
  watcherRow: {
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  watcherName: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  watcherPhone: { color: colors.muted, fontSize: 13, marginTop: 2 },
  sheetActions: { flexDirection: "row", gap: 8 },
});
