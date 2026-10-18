import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { Platform, StatusBar, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

import { findRoutes } from "../api";
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
  onStop,
}: {
  choice: Choice;
  destination: PlaceHit;
  routes: RouteResponse;
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
          mapRef.current?.animateToRegion(
            { ...next, latitudeDelta: FOLLOW_DELTA, longitudeDelta: FOLLOW_DELTA },
            400,
          );
          const current = routesRef.current;
          const line = toLatLngs(
            choice === "fastest" ? current.fastest.geometry : current.safety_focused.geometry,
          );
          if (distanceMeters(next, { latitude: destination.lat, longitude: destination.lng }) <= ARRIVE_METERS) {
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
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});
