import { useRef } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

import { BrandBlock } from "../components/BrandBlock";
import { Glyph, type GlyphName } from "../components/Glyph";
import { AppText } from "../components/ui/AppText";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { UserDot } from "../components/ui/MapMarks";
import { Screen } from "../components/ui/Screen";
import { regionFromStatus } from "../format";
import { mutedMapStyle, useTheme } from "../theme";
import type { DataStatusResponse, PlaceHit } from "../types";

export type Origin =
  | { status: "locating" }
  | { status: "denied" }
  | { status: "error" }
  | { status: "ready"; latitude: number; longitude: number };

function LocationField({
  glyph,
  label,
  value,
  placeholder,
  onPress,
}: {
  glyph: GlyphName;
  label: string;
  value: string;
  placeholder?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityLabel={`${label}: ${value}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        { alignItems: "center", flexDirection: "row", gap: theme.space.md, minHeight: 56 },
        pressed && { transform: [{ scale: theme.motion.pressScale }] },
      ]}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: theme.colors.primarySoft,
          borderRadius: theme.radius.full,
          height: 36,
          justifyContent: "center",
          width: 36,
        }}
      >
        <Glyph color={theme.colors.primary} name={glyph} />
      </View>
      <View style={{ flex: 1, gap: theme.space.xs }}>
        <AppText variant="overline">{label}</AppText>
        <AppText color={placeholder ? theme.colors.textSecondary : theme.colors.textPrimary} numberOfLines={1} variant="headline">
          {value}
        </AppText>
      </View>
      <Glyph color={theme.colors.textTertiary} name="chevron-right" />
    </Pressable>
  );
}

function originLabel(origin: Origin): string {
  switch (origin.status) {
    case "locating":
      return "Finding you…";
    case "denied":
      return "Turn on location to start";
    case "error":
      return "Couldn't find you. Tap to try again";
    case "ready":
      return "Your current location";
  }
}

export function HomeScreen({
  status,
  statusError,
  origin,
  destination,
  finding,
  findError,
  onRetryLocation,
  onPickDestination,
  onFind,
}: {
  status: DataStatusResponse | null;
  statusError: string | null;
  origin: Origin;
  destination: PlaceHit | null;
  finding: boolean;
  findError: string | null;
  onRetryLocation: () => void;
  onPickDestination: () => void;
  onFind: () => void;
}) {
  const theme = useTheme();
  const mapRef = useRef<MapView>(null);

  function recenter() {
    if (origin.status === "ready") {
      mapRef.current?.animateToRegion({
        latitude: origin.latitude,
        longitude: origin.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } else if (status) {
      mapRef.current?.animateToRegion(regionFromStatus(status));
    }
  }

  return (
    <Screen scroll>
      <View style={{ gap: theme.space.xxl }}>
        <BrandBlock />
        <Card style={{ gap: theme.space.md, paddingVertical: theme.space.md }}>
          <LocationField
            glyph="ring"
            label="Starting from"
            onPress={onRetryLocation}
            placeholder={origin.status !== "ready"}
            value={originLabel(origin)}
          />
          <View style={{ backgroundColor: theme.colors.border, height: 1 }} />
          <LocationField
            glyph="pin"
            label="Destination"
            onPress={onPickDestination}
            placeholder={!destination}
            value={destination?.name ?? "Where are you headed?"}
          />
        </Card>
        <View style={{ alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ gap: theme.space.xs }}>
            <AppText variant="overline">Around UW</AppText>
            <AppText variant="title2">Explore nearby</AppText>
          </View>
          <Button label="Recenter" onPress={recenter} variant="text" />
        </View>
        <View
          style={{
            backgroundColor: theme.colors.surfaceAlt,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            height: 224,
            overflow: "hidden",
          }}
        >
          {status ? (
            <MapView
              customMapStyle={mutedMapStyle}
              initialRegion={regionFromStatus(status)}
              ref={mapRef}
              showsCompass={false}
              showsMyLocationButton={false}
              showsPointsOfInterests={false}
              showsUserLocation={false}
              style={{ flex: 1 }}
              userInterfaceStyle={theme.isDark ? "dark" : "light"}
            >
              {origin.status === "ready" ? (
                <Marker anchor={{ x: 0.5, y: 0.5 }} coordinate={{ latitude: origin.latitude, longitude: origin.longitude }}>
                  <UserDot />
                </Marker>
              ) : null}
              {destination ? (
                <Marker
                  coordinate={{ latitude: destination.lat, longitude: destination.lng }}
                  pinColor={theme.colors.routeSafer}
                  title={destination.name}
                />
              ) : null}
            </MapView>
          ) : (
            <View style={{ alignItems: "center", flex: 1, justifyContent: "center", padding: theme.space.xl }}>
              {statusError ? (
                <AppText style={{ textAlign: "center" }} variant="subhead">
                  {statusError}
                </AppText>
              ) : (
                <ActivityIndicator color={theme.colors.primary} />
              )}
            </View>
          )}
        </View>
        {status && !status.ready ? <AppText variant="subhead">{status.message}</AppText> : null}
        {findError ? (
          <AppText style={{ color: theme.colors.error }} variant="callout">
            {findError}
          </AppText>
        ) : null}
        <Button
          disabled={origin.status !== "ready" || !destination}
          haptic="medium"
          label="Find a route"
          loading={finding}
          onPress={onFind}
        />
      </View>
    </Screen>
  );
}
