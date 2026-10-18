import { useRef } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

import { BrandBlock } from "../components/BrandBlock";
import { Glyph, type GlyphName } from "../components/Glyph";
import { PrimaryButton } from "../components/PrimaryButton";
import { regionFromStatus } from "../format";
import { colors } from "../theme";
import type { DataStatusResponse, PlaceHit } from "../types";

export type Origin =
  | { status: "locating" }
  | { status: "denied" }
  | { status: "error" }
  | { status: "ready"; latitude: number; longitude: number };

function LocationField({
  accent,
  glyph,
  label,
  value,
  placeholder,
  onPress,
}: {
  accent?: boolean;
  glyph: GlyphName;
  label: string;
  value: string;
  placeholder?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`${label}: ${value}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.field, pressed && styles.fieldPressed]}
    >
      <View style={[styles.fieldIcon, accent && styles.fieldIconAccent]}>
        <Glyph color={accent ? colors.teal : colors.blue} name={glyph} />
      </View>
      <View style={styles.fieldCopy}>
        <Text style={styles.eyebrow}>{label}</Text>
        <Text numberOfLines={1} style={[styles.fieldValue, placeholder && styles.fieldPlaceholder]}>
          {value}
        </Text>
      </View>
      <Glyph color={colors.mutedLight} name="chevron-right" />
    </Pressable>
  );
}

function originLabel(origin: Origin): string {
  switch (origin.status) {
    case "locating":
      return "Finding your location…";
    case "denied":
      return "Allow location access";
    case "error":
      return "Location unavailable. Tap to retry";
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
    <ScrollView contentContainerStyle={styles.screen} contentInsetAdjustmentBehavior="automatic">
      <BrandBlock tagline="Find your safer way home" />

      <View style={styles.card}>
        <LocationField
          glyph="ring"
          label="Starting from"
          onPress={onRetryLocation}
          placeholder={origin.status !== "ready"}
          value={originLabel(origin)}
        />
        <View style={styles.divider} />
        <LocationField
          accent
          glyph="pin"
          label="Destination"
          onPress={onPickDestination}
          placeholder={!destination}
          value={destination?.name ?? "Where are you going?"}
        />
      </View>

      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.eyebrow}>UW Campus</Text>
          <Text style={styles.h2}>Explore nearby</Text>
        </View>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={recenter}>
          <Text style={styles.textButton}>Recenter</Text>
        </Pressable>
      </View>

      <View style={styles.map}>
        {status ? (
          <MapView
            initialRegion={regionFromStatus(status)}
            ref={mapRef}
            showsUserLocation={origin.status === "ready"}
            style={StyleSheet.absoluteFill}
          >
            {destination && (
              <Marker
                coordinate={{ latitude: destination.lat, longitude: destination.lng }}
                pinColor={colors.teal}
                title={destination.name}
              />
            )}
          </MapView>
        ) : (
          <View style={styles.mapLabel}>
            {statusError ? (
              <Text style={styles.mapLabelSmall}>{statusError}</Text>
            ) : (
              <ActivityIndicator color={colors.teal} />
            )}
          </View>
        )}
      </View>

      {status && !status.ready && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{status.message}</Text>
        </View>
      )}
      {findError && (
        <View style={[styles.banner, styles.errorBanner]}>
          <Text style={[styles.bannerText, styles.errorText]}>{findError}</Text>
        </View>
      )}

      <View style={styles.primary}>
        <PrimaryButton
          disabled={origin.status !== "ready" || !destination}
          label="Find Safe Route"
          loading={finding}
          onPress={onFind}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 20,
    paddingTop: (Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0) + 26,
    paddingBottom: 18,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 23,
    overflow: "hidden",
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  field: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 70,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  fieldPressed: { backgroundColor: colors.surfaceSoft },
  fieldIcon: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 11,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  fieldIconAccent: { backgroundColor: colors.tealSoft },
  fieldCopy: { flex: 1, gap: 4, minWidth: 0 },
  eyebrow: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  fieldValue: { color: colors.ink, fontSize: 14, fontWeight: "600" },
  fieldPlaceholder: { color: colors.muted, fontWeight: "500" },
  divider: { backgroundColor: colors.line, height: 1, marginLeft: 65 },
  sectionHeading: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 11,
    marginHorizontal: 2,
    marginTop: 25,
  },
  h2: { color: colors.ink, fontSize: 17, fontWeight: "700", letterSpacing: -0.25, marginTop: 3 },
  textButton: { color: colors.blue, fontSize: 12, fontWeight: "600", padding: 5 },
  map: {
    alignItems: "center",
    backgroundColor: "#f0f4f4",
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 1,
    height: 224,
    justifyContent: "center",
    overflow: "hidden",
  },
  mapLabel: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 20,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  mapLabelSmall: { color: colors.muted, fontSize: 11, textAlign: "center" },
  banner: {
    backgroundColor: colors.blueSoft,
    borderRadius: 11,
    marginTop: 12,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  bannerText: { color: colors.blue, fontSize: 11, fontWeight: "600" },
  errorBanner: { backgroundColor: colors.dangerSoft },
  errorText: { color: colors.danger },
  primary: { marginTop: 16 },
});
