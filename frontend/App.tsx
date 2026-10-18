import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, Polyline, UrlTile } from "react-native-maps";

import { findRoutes } from "./src/api";
import type { RouteResponse } from "./src/types";

const SUZZALLO = { latitude: 47.65581, longitude: -122.30805 };
const THE_AVE = { latitude: 47.6612, longitude: -122.3131 };

const INITIAL_REGION = {
  latitude: 47.6585,
  longitude: -122.3106,
  latitudeDelta: 0.015,
  longitudeDelta: 0.015,
};

function toMapPoints(route: RouteResponse["safety_focused"]) {
  return route.geometry.coordinates.map(([longitude, latitude]) => ({
    latitude,
    longitude,
  }));
}

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<RouteResponse | null>(null);

  async function onFindRoute() {
    setLoading(true);
    setError(null);
    try {
      const result = await findRoutes({
        origin_lat: SUZZALLO.latitude,
        origin_lng: SUZZALLO.longitude,
        dest_lat: THE_AVE.latitude,
        dest_lng: THE_AVE.longitude,
        departure_time: new Date().toISOString(),
      });
      setRoute(result);
    } catch (caught) {
      setRoute(null);
      setError(caught instanceof Error ? caught.message : "Could not load a route.");
    } finally {
      setLoading(false);
    }
  }

  const safety = route?.safety_focused;
  const line = safety ? toMapPoints(safety) : [];
  const extra = safety?.metrics.extra_minutes_vs_fastest ?? 0;

  return (
    <View style={styles.screen}>
      {Platform.OS === "web" ? (
        <View style={styles.webNotice}>
          <Text style={styles.webTitle}>Map needs a phone</Text>
          <Text style={styles.webBody}>
            react-native-maps does not draw this screen in the browser. Open the
            project in Expo Go on your iPhone, or in the Android emulator.
          </Text>
        </View>
      ) : (
        <MapView
          style={styles.map}
          initialRegion={INITIAL_REGION}
          userInterfaceStyle="dark"
          mapType="standard"
        >
          <UrlTile
            urlTemplate="https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            maximumZ={19}
            flipY={false}
            zIndex={-1}
          />
          <Marker coordinate={SUZZALLO} title="Suzzallo Library" pinColor="#2563eb" />
          <Marker coordinate={THE_AVE} title="The Ave" pinColor="#dc2626" />
          {line.length > 1 ? (
            <Polyline coordinates={line} strokeColor="#0f766e" strokeWidth={5} />
          ) : null}
        </MapView>
      )}

      <View style={styles.card}>
        <Text style={styles.attribution}>© OpenStreetMap contributors © CARTO</Text>
        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={onFindRoute}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#04110e" />
          ) : (
            <Text style={styles.buttonLabel}>Find safest route</Text>
          )}
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {safety ? (
          <View style={styles.result}>
            <Text style={styles.resultTitle}>
              {safety.metrics.duration_min.toFixed(0)} min ·{" "}
              {(safety.metrics.distance_m / 1000).toFixed(2)} km
              {extra > 0.4 ? ` · +${extra.toFixed(0)} min` : ""}
            </Text>
            <Text style={styles.explanation}>{safety.explanation}</Text>
            {route?.routes_identical ? (
              <Text style={styles.note}>Both options follow the same path.</Text>
            ) : null}
            {route && route.data_coverage.unavailable.length > 0 ? (
              <Text style={styles.note}>
                Missing metadata, treated as unknown:{" "}
                {route.data_coverage.unavailable.join(", ")}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0b1220",
  },
  map: {
    flex: 1,
  },
  webNotice: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  webTitle: {
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  webBody: {
    color: "#cbd5e1",
    fontSize: 16,
    lineHeight: 22,
  },
  card: {
    backgroundColor: "#0f172a",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
    gap: 10,
  },
  attribution: {
    color: "#94a3b8",
    fontSize: 11,
  },
  button: {
    backgroundColor: "#5eead4",
    borderRadius: 12,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonLabel: {
    color: "#042f2e",
    fontSize: 16,
    fontWeight: "700",
  },
  error: {
    color: "#fecaca",
    fontSize: 14,
    lineHeight: 20,
  },
  result: {
    gap: 6,
  },
  resultTitle: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "700",
  },
  explanation: {
    color: "#e2e8f0",
    fontSize: 14,
    lineHeight: 20,
  },
  note: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 18,
  },
});
