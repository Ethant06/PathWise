import { useState } from "react";
import { View } from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";

import { ScreenHeader } from "../../components/ScreenHeader";
import { AppText } from "../../components/ui/AppText";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Chip } from "../../components/ui/Chip";
import { Screen } from "../../components/ui/Screen";
import { TextField } from "../../components/ui/TextField";
import { mutedMapStyle, useTheme } from "../../theme";
import { errorText } from "../shared/collection";
import { avoidZones, avoidZonesService } from "./service";

/** Radius steps between 50 and 500 m. React Native has no built-in slider. */
const RADII = [50, 100, 200, 300, 500];

/** Add a circular avoid zone (4.6) at a long-pressed map point. */
export function AvoidZoneEditor({
  point,
  onDone,
  onCancel,
}: {
  point: { lat: number; lng: number };
  onDone: () => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const [radius, setRadius] = useState(100);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const center = { latitude: point.lat, longitude: point.lng };
  // Show the whole circle with some room around it.
  const delta = (radius * 4) / 111_320;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const zone = await avoidZonesService().create({ name: name.trim() || undefined, lat: point.lat, lng: point.lng, radius_m: radius });
      avoidZones.set([...avoidZones.get().items, zone]);
      onDone();
    } catch (e) {
      setError(errorText(e, "Could not save the zone."));
      setSaving(false);
    }
  }

  return (
    <Screen scroll>
      <View style={{ gap: theme.space.xl }}>
        <ScreenHeader eyebrow="Avoid zone" onBack={onCancel} title="Add an avoid zone" />
        <View
          style={{
            backgroundColor: theme.colors.surfaceAlt,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            height: 200,
            overflow: "hidden",
          }}
        >
          <MapView
            customMapStyle={mutedMapStyle}
            region={{ ...center, latitudeDelta: delta, longitudeDelta: delta }}
            scrollEnabled={false}
            showsPointsOfInterests={false}
            style={{ flex: 1 }}
            userInterfaceStyle={theme.isDark ? "dark" : "light"}
            zoomEnabled={false}
          >
            <Circle
              center={center}
              fillColor={theme.colors.avoidZoneFill}
              radius={radius}
              strokeColor={theme.colors.avoidZoneStroke}
              strokeWidth={2}
            />
            <Marker coordinate={center} pinColor={theme.colors.avoidZoneStroke} />
          </MapView>
        </View>

        <Card style={{ gap: theme.space.md }}>
          <AppText variant="headline">Size</AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.space.sm }}>
            {RADII.map((value) => (
              <Chip
                accessibilityLabel={`${value} meter radius`}
                key={value}
                label={`${value} m`}
                onPress={() => setRadius(value)}
                selected={radius === value}
              />
            ))}
          </View>
          <TextField label="Name (optional)" maxLength={60} onChangeText={setName} placeholder="Dark alley, busy bar" value={name} />
        </Card>

        <AppText variant="subhead">
          Routes don&apos;t avoid these zones yet. PathWise tells you when a route passes through one.
        </AppText>
        {error ? (
          <AppText style={{ color: theme.colors.error }} variant="callout">
            {error}
          </AppText>
        ) : null}
        <Button haptic="success" label="Save zone" loading={saving} onPress={() => void save()} />
      </View>
    </Screen>
  );
}
