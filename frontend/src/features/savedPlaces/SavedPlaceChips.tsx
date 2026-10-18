import { View } from "react-native";

import { AppText } from "../../components/ui/AppText";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Chip } from "../../components/ui/Chip";
import { useTheme } from "../../theme";
import { placeTitle } from "./labels";
import { savedPlaces } from "./service";
import type { SavedPlace } from "./types";

/** One tap sets a saved place as the destination or the start (4.1). Sits under the From/To card. */
export function SavedPlaceChips({
  startId,
  destinationId,
  onGoTo,
  onStartFrom,
  onManage,
}: {
  startId: string | null;
  destinationId: string | null;
  onGoTo: (place: SavedPlace) => void;
  onStartFrom: (place: SavedPlace) => void;
  onManage: () => void;
}) {
  const theme = useTheme();
  const state = savedPlaces.use();

  if (state.items.length === 0) {
    return (
      <Button
        label={state.status === "error" ? "Saved places didn't load. Manage" : "Save home, work, or school for one-tap routes"}
        onPress={onManage}
        variant="text"
      />
    );
  }

  return (
    <Card style={{ gap: theme.space.md }}>
      <View style={{ gap: theme.space.sm }}>
        <AppText variant="overline">Go to</AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.space.sm }}>
          {state.items.map((place) => (
            <Chip
              accessibilityLabel={`Go to ${placeTitle(place)}`}
              key={place.id}
              label={placeTitle(place)}
              onPress={() => onGoTo(place)}
              selected={destinationId === place.id}
            />
          ))}
        </View>
      </View>
      <View style={{ gap: theme.space.sm }}>
        <AppText variant="overline">Start from</AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.space.sm }}>
          {state.items.map((place) => (
            <Chip
              accessibilityLabel={`Start from ${placeTitle(place)}`}
              key={place.id}
              label={placeTitle(place)}
              onPress={() => onStartFrom(place)}
              selected={startId === place.id}
            />
          ))}
        </View>
      </View>
      <Button label="Manage saved places" onPress={onManage} variant="text" />
    </Card>
  );
}
