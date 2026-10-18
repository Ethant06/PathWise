import { useState } from "react";
import { Alert, View } from "react-native";

import { ScreenHeader } from "../../components/ScreenHeader";
import { AppText } from "../../components/ui/AppText";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Screen } from "../../components/ui/Screen";
import { StateMessage } from "../../components/ui/StateMessage";
import { isEnabled } from "../../config/features";
import { useTheme } from "../../theme";
import { appRouteLink, devRouteLink, routeLinkTarget } from "../deepLinks/links";
import { errorText } from "../shared/collection";
import { labelText, placeTitle } from "./labels";
import { SavedPlaceEditor } from "./SavedPlaceEditor";
import { savedPlaces, savedPlacesAreLocal, savedPlacesService } from "./service";
import type { SavedPlace } from "./types";

/** Manage saved places (4.1). One tap on a place sets it as the start or the destination. */
export function SavedPlacesScreen({
  onBack,
  onStartFrom,
  onGoTo,
}: {
  onBack: () => void;
  onStartFrom: (place: SavedPlace) => void;
  onGoTo: (place: SavedPlace) => void;
}) {
  const theme = useTheme();
  const state = savedPlaces.use();
  const [editing, setEditing] = useState<SavedPlace | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return (
      <SavedPlaceEditor
        existing={editing === "new" ? undefined : editing}
        onCancel={() => setEditing(null)}
        onDone={() => setEditing(null)}
      />
    );
  }

  function confirmDelete(place: SavedPlace) {
    Alert.alert(`Delete ${placeTitle(place)}?`, undefined, [
      { style: "cancel", text: "Cancel" },
      {
        style: "destructive",
        text: "Delete",
        onPress: () => {
          setError(null);
          savedPlacesService()
            .remove(place.id)
            .then(() => savedPlaces.set(savedPlaces.get().items.filter((item) => item.id !== place.id)))
            .catch((e: unknown) => setError(errorText(e, "Could not delete this place.")));
        },
      },
    ]);
  }

  return (
    <Screen scroll>
      <View style={{ gap: theme.space.xl }}>
        <ScreenHeader eyebrow="Profile" onBack={onBack} title="Saved places" />
        <AppText variant="subhead">
          {savedPlacesAreLocal()
            ? "Saved on this phone only. Nothing is sent to the server yet."
            : "Saved to your account. Only you can see them."}
        </AppText>

        {state.status === "loading" && state.items.length === 0 ? <StateMessage kind="loading" message="Loading places" /> : null}
        {state.status === "error" ? (
          <StateMessage actionLabel="Try again" kind="error" message={state.error} onAction={() => void savedPlaces.refresh()} />
        ) : null}
        {state.status === "ready" && state.items.length === 0 ? (
          <StateMessage
            kind="empty"
            message="Save home, work, or school to route there in one tap."
            title="No saved places yet"
          />
        ) : null}

        {state.items.map((place) => (
          <Card key={place.id} style={{ gap: theme.space.sm }}>
            <AppText variant="overline">{labelText(place.label)}</AppText>
            <AppText variant="headline">{place.name}</AppText>
            <View style={{ flexDirection: "row", gap: theme.space.sm }}>
              <View style={{ flex: 1 }}>
                <Button
                  accessibilityLabel={`Start from ${placeTitle(place)}`}
                  label="Start here"
                  onPress={() => onStartFrom(place)}
                  variant="secondary"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button accessibilityLabel={`Go to ${placeTitle(place)}`} label="Go here" onPress={() => onGoTo(place)} />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: theme.space.sm }}>
              <View style={{ flex: 1 }}>
                <Button
                  accessibilityLabel={`Edit ${placeTitle(place)}`}
                  label="Rename or move"
                  onPress={() => setEditing(place)}
                  variant="text"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  accessibilityLabel={`Delete ${placeTitle(place)}`}
                  label="Delete"
                  onPress={() => confirmDelete(place)}
                  variant="text"
                />
              </View>
            </View>
            {isEnabled("deepLinks") ? (
              <View style={{ gap: theme.space.xxs }}>
                <AppText selectable variant="caption">
                  Shortcut link: {appRouteLink(routeLinkTarget(place))}
                </AppText>
                {__DEV__ ? (
                  <AppText selectable variant="caption">
                    In Expo Go: {devRouteLink(routeLinkTarget(place))}
                  </AppText>
                ) : null}
              </View>
            ) : null}
          </Card>
        ))}

        {error ? (
          <AppText style={{ color: theme.colors.error }} variant="callout">
            {error}
          </AppText>
        ) : null}
        <Button haptic="light" label="Add a place" onPress={() => setEditing("new")} />
      </View>
    </Screen>
  );
}
