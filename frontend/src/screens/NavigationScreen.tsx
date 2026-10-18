import * as Location from "expo-location";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { findRoutes, listWatchers, startWatch, updateWatch, type Watcher } from "../api";
import { AppText } from "../components/ui/AppText";
import { Button } from "../components/ui/Button";
import { UserDot } from "../components/ui/MapMarks";
import { isEnabled } from "../config/features";
import { avoidZones } from "../features/avoidZones/service";
import { AvoidZoneCircles, ReportMarkers } from "../features/map/layers";
import { reports as recentReports } from "../features/reports/service";
import { useVoiceEnabled } from "../features/voice/settings";
import { useWalkVoice } from "../features/voice/useWalkVoice";
import { formatElapsed } from "../features/walks/format";
import { useWalkSession, type WalkPlan } from "../features/walks/useWalkSession";
import { formatMiles, toLatLngs } from "../format";
import { ARRIVE_METERS, distanceMeters, distanceToPath, OFF_ROUTE_METERS, type LatLng } from "../geo";
import { mapStroke, mutedMapStyle, useTheme, type Theme } from "../theme";
import type { PlaceHit, RouteResponse } from "../types";

type Choice = "fastest" | "safety_focused";

const REROUTE_WAIT_MS = 8_000;
const FOLLOW_DELTA = 0.004;
/** Time to show "You arrived" before the walk ends on its own. */
const ARRIVED_HOLD_MS = 3_000;

export function NavigationScreen({
  choice,
  destination,
  routes,
  walkerName,
  onStop,
  walk,
}: {
  choice: Choice;
  destination: PlaceHit;
  routes: RouteResponse;
  walkerName: string;
  onStop: (routes: RouteResponse) => void;
  /** Walk session (4.2). When set, ending the walk records it instead of going back. */
  walk?: WalkPlan;
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
  const [open, setOpen] = useState(false);
  const [watchers, setWatchers] = useState<Watcher[] | null>(null);
  const [line, setLine] = useState("");
  const [watchId, setWatchId] = useState<string | null>(null);
  const [watchError, setWatchError] = useState<string | null>(null);
  const watchIdRef = useRef<string | null>(null);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const arrivedRef = useRef(false);
  const hereRef = useRef<LatLng | null>(null);
  const streetAt = useRef(0);
  const streetPoint = useRef<LatLng | null>(null);

  const selected = choice === "fastest" ? activeRoutes.fastest : activeRoutes.safety_focused;
  const path = toLatLngs(selected.geometry);
  const lineColor = choice === "fastest" ? theme.colors.routeFastest : theme.colors.routeSafer;
  const destinationCoord = { latitude: destination.lat, longitude: destination.lng };
  const milesAway = here ? formatMiles(distanceMeters(here, destinationCoord)) : "Locating";
  const detail = status === "Following your location" ? destination.name : status;

  const initialRoute = choice === "fastest" ? routes.fastest : routes.safety_focused;
  const walkSession = useWalkSession({ choice, initialRoute, path, here });
  const endedRef = useRef(false);
  const zones = avoidZones.use();
  const reported = recentReports.use();
  const voiceOn = useVoiceEnabled();
  const shownZones = isEnabled("avoidZones") ? zones.items : [];
  const shownReports = isEnabled("reports") ? reported.items : [];

  useWalkVoice({
    enabled: Boolean(walk) && isEnabled("voice") && voiceOn,
    choice,
    route: initialRoute,
    destinationName: destination.name,
    here,
    remainingMeters: walkSession.remainingMeters,
    arrived,
    zones: shownZones,
    reports: shownReports,
  });

  function endWalk(endedBy: "user" | "arrived") {
    if (!walk) {
      onStop(activeRoutes);
      return;
    }
    if (endedRef.current) return;
    endedRef.current = true;
    walk.onEnded(walkSession.buildWalk(endedBy, walk.origin, walk.destination));
  }

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

  useEffect(() => {
    routesRef.current = activeRoutes;
  }, [activeRoutes]);

  // The walk ends on its own at the existing arrival check (ARRIVE_METERS), after the
  // watcher's "arrived" ping has gone out.
  useEffect(() => {
    if (!walk || !arrived) return;
    const timer = setTimeout(() => endWalk("arrived"), ARRIVED_HOLD_MS);
    return () => clearTimeout(timer);
    // endWalk reads refs and the latest props; re-arming on each render would reset the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walk, arrived]);

  useEffect(() => {
    let cancelled = false;
    listWatchers()
      .then((result) => {
        if (cancelled) return;
        setLine(result.line);
        setWatchers(result.watchers);
      })
      .catch(() => {
        if (!cancelled) setWatchers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  async function refreshWatchers() {
    try {
      const result = await listWatchers(true);
      setLine(result.line);
      setWatchers(result.watchers);
      setWatchError(null);
    } catch (error) {
      setWatchError(error instanceof Error ? error.message : "Could not load people who texted.");
    }
  }

  async function beginWatch(watcher: Watcher) {
    setWatchError(null);
    setOpen(false);
    setWatcherName(watcher.name);
    try {
      const session = await startWatch({
        walker_name: walkerName.trim() || "Someone",
        watcher_handle: watcher.handle,
        destination_name: destination.name,
      });
      setWatcherName(session.watcher_name);
      watchIdRef.current = session.id;
      setWatchId(session.id);
      if (session.notice) setWatchError(session.notice);
    } catch (error) {
      setWatcherName("");
      setOpen(true);
      setWatchError(error instanceof Error ? error.message : "Could not start the watch.");
    }
  }

  return (
    <View style={styles.screen}>
      <MapView
        customMapStyle={mutedMapStyle}
        initialRegion={{
          latitude: here?.latitude ?? path[0]?.latitude ?? destination.lat,
          longitude: here?.longitude ?? path[0]?.longitude ?? destination.lng,
          latitudeDelta: FOLLOW_DELTA,
          longitudeDelta: FOLLOW_DELTA,
        }}
        ref={mapRef}
        showsCompass={false}
        showsMyLocationButton={false}
        showsPointsOfInterests={false}
        showsUserLocation={false}
        style={styles.map}
        userInterfaceStyle={theme.isDark ? "dark" : "light"}
      >
        {path.length > 1 ? (
          <Polyline
            coordinates={path}
            lineCap="round"
            lineJoin="round"
            strokeColor={lineColor}
            strokeWidth={mapStroke.walked}
          />
        ) : null}
        {here ? (
          <Marker anchor={{ x: 0.5, y: 0.5 }} coordinate={here}>
            <UserDot />
          </Marker>
        ) : null}
        <Marker coordinate={destinationCoord} pinColor={theme.colors.routeSafer} title={destination.name} />
        <AvoidZoneCircles zones={shownZones} />
        <ReportMarkers reports={shownReports} />
      </MapView>

      <View pointerEvents="none" style={[styles.statusCard, { top: insets.top + theme.space.lg }]}>
        <AppText variant="title2">{street}</AppText>
        <AppText variant="stat">{arrived || milesAway === "Locating" ? (arrived ? "0.0" : "—") : milesAway.replace(" mi", "")}</AppText>
        <AppText variant="subhead">
          {arrived ? "You arrived" : milesAway === "Locating" ? "Finding you" : `miles to ${detail}`}
        </AppText>
        {walk ? (
          <AppText accessibilityLiveRegion="polite" variant="caption">
            {formatElapsed(walkSession.elapsedMs)} walking
            {walkSession.remainingMeters !== null && !arrived
              ? ` · ${formatMiles(walkSession.remainingMeters)} left along the route`
              : ""}
          </AppText>
        ) : null}
      </View>

      <View style={[styles.stop, { paddingBottom: insets.bottom + theme.space.lg }]}>
        <View style={styles.handle} />
        {watchId ? (
          <AppText color={theme.colors.primary} variant="subhead">
            {watcherName.trim()} is watching
          </AppText>
        ) : (
          <View style={styles.watchSetup}>
            <AppText variant="subhead">They get a text if you stop, leave the path, or arrive.</AppText>
            <Button
              label={open ? "Hide names" : "Choose who is watching"}
              onPress={() => setOpen((value) => !value)}
              variant="secondary"
            />
            {open ? (
              <View>
                {watchers === null ? <AppText variant="caption">Loading names…</AppText> : null}
                {watchers?.length === 0 ? (
                  <AppText variant="caption">
                    {line ? `No one yet. They can text ${line} and send their name.` : "No one has texted yet."}
                  </AppText>
                ) : null}
                {watchers?.map((watcher) => (
                  <Pressable key={watcher.handle} onPress={() => void beginWatch(watcher)} style={styles.watcherRow}>
                    <AppText variant="headline">{watcher.name}</AppText>
                    {watcher.name !== watcher.phone ? <AppText variant="caption">{watcher.phone}</AppText> : null}
                  </Pressable>
                ))}
                <Button label="Refresh" onPress={() => void refreshWatchers()} variant="text" />
              </View>
            ) : null}
          </View>
        )}
        {watchError ? (
          <AppText style={{ color: theme.colors.error }} variant="caption">
            {watchError}
          </AppText>
        ) : null}
        <Button haptic="medium" label="End walk" onPress={() => endWalk("user")} />
      </View>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    screen: { backgroundColor: theme.colors.background, flex: 1 },
    map: { flex: 1 },
    statusCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      left: theme.space.lg,
      padding: theme.space.lg,
      position: "absolute",
      right: theme.space.lg,
      ...theme.shadow.md,
    },
    stop: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.radius.xl,
      borderTopRightRadius: theme.radius.xl,
      gap: theme.space.md,
      paddingHorizontal: theme.space.lg,
      paddingTop: theme.space.md,
      ...theme.shadow.lg,
    },
    handle: {
      alignSelf: "center",
      backgroundColor: theme.colors.border,
      borderRadius: theme.radius.full,
      height: theme.space.xs,
      width: theme.size.buttonSm,
    },
    watchSetup: { gap: theme.space.sm },
    watcherRow: {
      borderBottomColor: theme.colors.border,
      borderBottomWidth: 1,
      paddingVertical: theme.space.md,
    },
  });
}
