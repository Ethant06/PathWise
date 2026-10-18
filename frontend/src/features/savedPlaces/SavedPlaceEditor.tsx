import * as Location from "expo-location";
import { useState } from "react";
import { View } from "react-native";

import { ScreenHeader } from "../../components/ScreenHeader";
import { AppText } from "../../components/ui/AppText";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Chip } from "../../components/ui/Chip";
import { Screen } from "../../components/ui/Screen";
import { TextField } from "../../components/ui/TextField";
import { PlacesScreen } from "../../screens/PlacesScreen";
import { useTheme } from "../../theme";
import { MapPickerScreen } from "../map/MapPickerScreen";
import { errorText } from "../shared/collection";
import { LABELS, labelText } from "./labels";
import { savedPlaces, savedPlacesAreLocal, savedPlacesService } from "./service";
import type { SavedPlace, SavedPlaceLabel } from "./types";

type Point = { lat: number; lng: number; description: string };

/** Add, rename, or move a saved place. The location comes from search, GPS, or the map. */
export function SavedPlaceEditor({
  existing,
  initialLabel = "home",
  onDone,
  onCancel,
}: {
  existing?: SavedPlace;
  initialLabel?: SavedPlaceLabel;
  onDone: () => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const places = savedPlaces.use().items;
  const [label, setLabel] = useState<SavedPlaceLabel>(existing?.label ?? initialLabel);
  const [name, setName] = useState(existing?.name ?? "");
  const [point, setPoint] = useState<Point | null>(
    existing ? { lat: existing.lat, lng: existing.lng, description: "Current saved location" } : null,
  );
  const [picker, setPicker] = useState<"form" | "search" | "map">("form");
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Home, work, and school are one each: saving a second one replaces the first.
  const replaces =
    !existing && label !== "custom" ? (places.find((place) => place.label === label) ?? null) : null;
  const target = existing ?? replaces;

  async function fillCurrentLocation() {
    setLocating(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setError("Allow location access, or pick the place from search or the map.");
        return;
      }
      const position = await Location.getCurrentPositionAsync();
      setPoint({ lat: position.coords.latitude, lng: position.coords.longitude, description: "Your current location" });
    } catch {
      setError("Could not find your location. Try search or the map.");
    } finally {
      setLocating(false);
    }
  }

  async function save() {
    if (!point) return;
    const finalName = name.trim() || (label === "custom" ? "" : labelText(label));
    if (!finalName) {
      setError("Give this place a name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const input = { label, name: finalName, lat: point.lat, lng: point.lng };
      const service = savedPlacesService();
      const saved = target ? await service.update(target.id, input) : await service.create(input);
      const current = savedPlaces.get().items;
      savedPlaces.set(target ? current.map((place) => (place.id === saved.id ? saved : place)) : [...current, saved]);
      onDone();
    } catch (e) {
      setError(errorText(e, "Could not save this place."));
      setSaving(false);
    }
  }

  if (picker === "search") {
    return (
      <PlacesScreen
        onBack={() => setPicker("form")}
        onSelect={(place) => {
          setPoint({ lat: place.lat, lng: place.lng, description: place.name });
          if (!name.trim() && label === "custom") setName(place.name);
          setPicker("form");
        }}
      />
    );
  }

  if (picker === "map") {
    return (
      <MapPickerScreen
        initial={point}
        onBack={() => setPicker("form")}
        onPick={(picked) => {
          setPoint({ ...picked, description: "Picked on the map" });
          setPicker("form");
        }}
        title={label === "custom" ? "Saved place" : labelText(label)}
      />
    );
  }

  return (
    <Screen scroll>
      <View style={{ gap: theme.space.xl }}>
        <ScreenHeader eyebrow="Saved places" onBack={onCancel} title={existing ? "Edit place" : "Add a place"} />

        <Card style={{ gap: theme.space.md }}>
          <AppText variant="headline">Type</AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.space.sm }}>
            {LABELS.map((item) => (
              <Chip key={item.value} label={item.text} onPress={() => setLabel(item.value)} selected={label === item.value} />
            ))}
          </View>
          {replaces ? (
            <AppText variant="caption">This replaces your saved {labelText(label)}.</AppText>
          ) : null}
          <TextField
            label={label === "custom" ? "Name" : "Name (optional)"}
            maxLength={60}
            onChangeText={setName}
            placeholder={label === "custom" ? "Gym, Mom's place, Library" : labelText(label)}
            value={name}
          />
        </Card>

        <Card style={{ gap: theme.space.md }}>
          <AppText variant="headline">Location</AppText>
          <AppText variant="subhead">
            {point ? `${point.description} (${point.lat.toFixed(4)}, ${point.lng.toFixed(4)})` : "Not set yet"}
          </AppText>
          <Button label="Search places" onPress={() => setPicker("search")} variant="secondary" />
          <Button label="Use my current location" loading={locating} onPress={() => void fillCurrentLocation()} variant="secondary" />
          <Button label="Pick on the map" onPress={() => setPicker("map")} variant="secondary" />
        </Card>

        {label === "home" ? (
          <AppText variant="caption">
            {savedPlacesAreLocal()
              ? "Home is private. It stays on this phone and is never shown to anyone else."
              : "Home is private. It is saved only to your account and never shown to anyone else."}
          </AppText>
        ) : null}
        {error ? (
          <AppText style={{ color: theme.colors.error }} variant="callout">
            {error}
          </AppText>
        ) : null}
        <Button disabled={!point} haptic="success" label="Save place" loading={saving} onPress={() => void save()} />
      </View>
    </Screen>
  );
}
