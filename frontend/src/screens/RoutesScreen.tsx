import { useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

import { Glyph, type GlyphName } from "../components/Glyph";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenHeader } from "../components/ScreenHeader";
import { formatMiles, formatMinutes, toLatLngs } from "../format";
import { colors } from "../theme";
import type { PlaceHit, RoutePayload, RouteResponse } from "../types";

type Choice = "fastest" | "safety_focused";

function RouteCard({
  glyph,
  name,
  route,
  recommended,
  selected,
  tone,
  onPress,
}: {
  glyph: GlyphName;
  name: string;
  route: RoutePayload;
  recommended?: boolean;
  selected: boolean;
  tone: "blue" | "teal";
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.routeCard, selected && styles.routeCardSelected]}
    >
      <View style={[styles.routeIcon, tone === "blue" ? styles.iconBlue : styles.iconTeal]}>
        <Glyph color={tone === "blue" ? colors.blue : colors.teal} name={glyph} />
      </View>
      <View style={styles.routeContent}>
        <View style={styles.titleRow}>
          <Text style={styles.routeName}>{name}</Text>
          {recommended && (
            <View style={styles.recommended}>
              <Text style={styles.recommendedText}>Recommended</Text>
            </View>
          )}
        </View>
        <View style={styles.stats}>
          <Text style={styles.stat}>{formatMinutes(route.metrics.duration_min)}</Text>
          <Text style={styles.stat}>{formatMiles(route.metrics.distance_m)}</Text>
        </View>
        <Text style={styles.description}>{route.explanation}</Text>
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]} />
    </Pressable>
  );
}

export function RoutesScreen({
  routes,
  destination,
  origin,
  onBack,
}: {
  routes: RouteResponse;
  destination: PlaceHit;
  origin: { latitude: number; longitude: number };
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<Choice>("safety_focused");
  const [started, setStarted] = useState(false);
  const mapRef = useRef<MapView>(null);

  const fastest = toLatLngs(routes.fastest.geometry);
  const safer = toLatLngs(routes.safety_focused.geometry);
  const destinationCoord = { latitude: destination.lat, longitude: destination.lng };

  function fitRoutes() {
    mapRef.current?.fitToCoordinates([origin, destinationCoord, ...fastest, ...safer], {
      animated: false,
      edgePadding: { top: 24, right: 24, bottom: 24, left: 24 },
    });
  }

  // Draw the selected route last so it sits on top.
  const fastestLine = { key: "fastest" as const, coords: fastest, color: colors.blue };
  const saferLine = { key: "safety_focused" as const, coords: safer, color: colors.teal };
  const lines = selected === "fastest" ? [saferLine, fastestLine] : [fastestLine, saferLine];

  return (
    <ScrollView contentContainerStyle={styles.screen} contentInsetAdjustmentBehavior="automatic">
      <ScreenHeader eyebrow="Route options" onBack={onBack} title="Choose Your Route" />
      <Text style={styles.intro}>From your location to {destination.name}</Text>

      <View style={styles.list}>
        <RouteCard
          glyph="route"
          name="Fastest Route"
          onPress={() => setSelected("fastest")}
          route={routes.fastest}
          selected={selected === "fastest"}
          tone="blue"
        />
        <RouteCard
          glyph="check"
          name="Safer Route"
          onPress={() => setSelected("safety_focused")}
          recommended
          route={routes.safety_focused}
          selected={selected === "safety_focused"}
          tone="teal"
        />
      </View>
      {routes.routes_identical && (
        <Text style={styles.note}>Both options follow the same path for this trip.</Text>
      )}

      <View style={styles.mapSection}>
        <View style={styles.mapTitle}>
          <Text style={styles.h2}>Route preview</Text>
          {selected === "safety_focused" && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>Safety optimized</Text>
            </View>
          )}
        </View>
        <View style={styles.map}>
          <MapView onMapReady={fitRoutes} ref={mapRef} style={StyleSheet.absoluteFill}>
            {lines.map((line) => (
              <Polyline
                coordinates={line.coords}
                key={line.key}
                strokeColor={line.key === selected ? line.color : `${line.color}66`}
                strokeWidth={line.key === selected ? 5 : 3}
              />
            ))}
            <Marker coordinate={origin} pinColor={colors.blue} title="Start" />
            <Marker coordinate={destinationCoord} pinColor={colors.teal} title={destination.name} />
          </MapView>
        </View>
      </View>

      {started && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Navigation preview started</Text>
        </View>
      )}
      <View style={styles.primary}>
        <PrimaryButton label="Start Navigation" onPress={() => setStarted(true)} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 20,
    paddingTop: (Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0) + 24,
    paddingBottom: 18,
  },
  intro: { color: colors.muted, fontSize: 12, marginBottom: 17, marginTop: 10 },
  list: { gap: 10 },
  note: { color: colors.muted, fontSize: 11, marginTop: 8 },
  routeCard: {
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 17,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 11,
    paddingHorizontal: 13,
    paddingVertical: 14,
  },
  routeCardSelected: { backgroundColor: "#f5fbfa", borderColor: colors.teal },
  routeIcon: { alignItems: "center", borderRadius: 11, height: 39, justifyContent: "center", width: 39 },
  iconBlue: { backgroundColor: colors.blueSoft },
  iconTeal: { backgroundColor: colors.tealSoft },
  routeContent: { flex: 1, minWidth: 0 },
  titleRow: { alignItems: "center", flexDirection: "row", gap: 7, minHeight: 18 },
  routeName: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  recommended: { backgroundColor: colors.tealSoft, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 3 },
  recommendedText: { color: colors.teal, fontSize: 8, fontWeight: "800", textTransform: "uppercase" },
  stats: { flexDirection: "row", gap: 10, marginVertical: 5 },
  stat: { color: colors.muted, fontSize: 11 },
  description: { color: colors.muted, fontSize: 10 },
  radio: {
    borderColor: colors.mutedLight,
    borderRadius: 9,
    borderWidth: 1.5,
    height: 18,
    marginTop: 2,
    width: 18,
  },
  radioSelected: { borderColor: colors.teal, borderWidth: 5 },
  mapSection: { marginTop: 19 },
  mapTitle: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  h2: { color: colors.ink, fontSize: 17, fontWeight: "700", letterSpacing: -0.25 },
  chip: { backgroundColor: colors.tealSoft, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 5 },
  chipText: { color: colors.teal, fontSize: 9, fontWeight: "700" },
  map: {
    backgroundColor: "#f0f4f4",
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 1,
    height: 174,
    overflow: "hidden",
  },
  banner: {
    backgroundColor: colors.blueSoft,
    borderRadius: 11,
    marginTop: 12,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  bannerText: { color: colors.blue, fontSize: 11, fontWeight: "600" },
  primary: { marginTop: 16 },
});
