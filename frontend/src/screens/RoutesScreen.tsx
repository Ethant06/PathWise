import { useRef, useState } from "react";
import { Pressable, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

import { Glyph, type GlyphName } from "../components/Glyph";
import { ScreenHeader } from "../components/ScreenHeader";
import { AppText } from "../components/ui/AppText";
import { Button } from "../components/ui/Button";
import { Screen } from "../components/ui/Screen";
import { formatMiles, formatMinutes, toLatLngs } from "../format";
import { mapStroke, mutedMapStyle, useTheme, uw } from "../theme";
import type { PlaceHit, RoutePayload, RouteResponse } from "../types";

type Choice = "fastest" | "safety_focused";

function RouteCard({
  glyph,
  name,
  route,
  recommended,
  selected,
  onPress,
}: {
  glyph: GlyphName;
  name: string;
  route: RoutePayload;
  recommended?: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        {
          alignItems: "flex-start",
          backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          flexDirection: "row",
          gap: theme.space.md,
          padding: theme.space.lg,
        },
        pressed && { transform: [{ scale: theme.motion.pressScale }] },
      ]}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.full,
          height: 36,
          justifyContent: "center",
          width: 36,
        }}
      >
        <Glyph color={theme.colors.primary} name={glyph} />
      </View>
      <View style={{ flex: 1, gap: theme.space.xs }}>
        <View style={{ alignItems: "center", flexDirection: "row", gap: theme.space.sm }}>
          <AppText variant="headline">{name}</AppText>
          {recommended ? (
            <View
              style={{
                backgroundColor: uw.huskyGoldTint,
                borderRadius: theme.radius.full,
                paddingHorizontal: theme.space.sm,
                paddingVertical: theme.space.xxs,
              }}
            >
              <AppText color={theme.colors.goldText} variant="caption">
                Recommended
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText variant="subhead">
          {formatMinutes(route.metrics.duration_min)} · {formatMiles(route.metrics.distance_m)}
        </AppText>
        <AppText variant="caption">{route.explanation}</AppText>
      </View>
      <View
        style={{
          borderColor: selected ? theme.colors.primary : theme.colors.textTertiary,
          borderRadius: theme.radius.full,
          borderWidth: selected ? 5 : 1,
          height: 18,
          marginTop: theme.space.xxs,
          width: 18,
        }}
      />
    </Pressable>
  );
}

export function RoutesScreen({
  routes,
  destination,
  origin,
  onBack,
  onStart,
}: {
  routes: RouteResponse;
  destination: PlaceHit;
  origin: { latitude: number; longitude: number };
  onBack: () => void;
  onStart: (choice: Choice) => void;
}) {
  const theme = useTheme();
  const [selected, setSelected] = useState<Choice>("safety_focused");
  const mapRef = useRef<MapView>(null);

  const fastest = toLatLngs(routes.fastest.geometry);
  const safer = toLatLngs(routes.safety_focused.geometry);
  const destinationCoord = { latitude: destination.lat, longitude: destination.lng };

  function fitRoutes() {
    mapRef.current?.fitToCoordinates([origin, destinationCoord, ...fastest, ...safer], {
      animated: false,
      edgePadding: { top: theme.space.xxl, right: theme.space.xxl, bottom: theme.space.xxl, left: theme.space.xxl },
    });
  }

  const fastestLine = { key: "fastest" as const, coords: fastest, color: theme.colors.routeFastest };
  const saferLine = { key: "safety_focused" as const, coords: safer, color: theme.colors.routeSafer };
  const lines = selected === "fastest" ? [saferLine, fastestLine] : [fastestLine, saferLine];

  return (
    <Screen scroll>
      <View style={{ gap: theme.space.lg }}>
        <ScreenHeader eyebrow="Routes" onBack={onBack} title="Choose a walk" />
        <AppText variant="subhead">From where you are to {destination.name}</AppText>
        <View style={{ gap: theme.space.md }}>
          <RouteCard
            glyph="route"
            name="Fastest"
            onPress={() => setSelected("fastest")}
            route={routes.fastest}
            selected={selected === "fastest"}
          />
          <RouteCard
            glyph="check"
            name="Safer"
            onPress={() => setSelected("safety_focused")}
            recommended
            route={routes.safety_focused}
            selected={selected === "safety_focused"}
          />
        </View>
        {routes.routes_identical ? (
          <AppText variant="caption">Both options follow the same path for this trip.</AppText>
        ) : null}
        <View style={{ gap: theme.space.sm }}>
          <AppText variant="title2">Preview</AppText>
          <View
            style={{
              backgroundColor: theme.colors.surfaceAlt,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.lg,
              borderWidth: 1,
              height: 176,
              overflow: "hidden",
            }}
          >
            <MapView
              customMapStyle={mutedMapStyle}
              onMapReady={fitRoutes}
              ref={mapRef}
              showsCompass={false}
              showsPointsOfInterests={false}
              style={{ flex: 1 }}
              userInterfaceStyle={theme.isDark ? "dark" : "light"}
            >
              {lines.map((line) => (
                <Polyline
                  coordinates={line.coords}
                  key={line.key}
                  lineCap="round"
                  lineJoin="round"
                  strokeColor={line.key === selected ? line.color : `${line.color}66`}
                  strokeWidth={mapStroke.walked}
                />
              ))}
              <Marker coordinate={origin} title="Start">
                <View
                  style={{
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.surface,
                    borderRadius: theme.radius.full,
                    borderWidth: 2,
                    height: 12,
                    width: 12,
                  }}
                />
              </Marker>
              <Marker coordinate={destinationCoord} pinColor={theme.colors.routeSafer} title={destination.name} />
            </MapView>
          </View>
        </View>
        <Button haptic="medium" label="Start walk" onPress={() => onStart(selected)} />
      </View>
    </Screen>
  );
}
