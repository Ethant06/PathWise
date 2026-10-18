import { useState } from "react";
import { Alert, View } from "react-native";

import { ScreenHeader } from "../../components/ScreenHeader";
import { AppText } from "../../components/ui/AppText";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Screen } from "../../components/ui/Screen";
import { StateMessage } from "../../components/ui/StateMessage";
import { usesApi } from "../../config/features";
import { useTheme } from "../../theme";
import { errorText } from "../shared/collection";
import { avoidZones, avoidZonesService, zoneName } from "./service";
import type { AvoidZone } from "./types";

/** List and delete avoid zones. New zones are added by long-pressing the map. */
export function AvoidZonesScreen({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const state = avoidZones.use();
  const [error, setError] = useState<string | null>(null);

  function confirmDelete(zone: AvoidZone) {
    Alert.alert(`Delete ${zoneName(zone)}?`, undefined, [
      { style: "cancel", text: "Cancel" },
      {
        style: "destructive",
        text: "Delete",
        onPress: () => {
          setError(null);
          avoidZonesService()
            .remove(zone.id)
            .then(() => avoidZones.set(avoidZones.get().items.filter((item) => item.id !== zone.id)))
            .catch((e: unknown) => setError(errorText(e, "Could not delete the zone.")));
        },
      },
    ]);
  }

  return (
    <Screen scroll>
      <View style={{ gap: theme.space.xl }}>
        <ScreenHeader eyebrow="Profile" onBack={onBack} title="Avoid zones" />
        <AppText variant="subhead">
          Long-press the map on Home to add one. Routes don&apos;t avoid these zones yet; PathWise tells you when a route
          passes through one. {usesApi("avoidZones") ? "Saved to your account." : "Saved on this phone only."}
        </AppText>

        {state.status === "loading" && state.items.length === 0 ? <StateMessage kind="loading" message="Loading zones" /> : null}
        {state.status === "error" ? (
          <StateMessage actionLabel="Try again" kind="error" message={state.error} onAction={() => void avoidZones.refresh()} />
        ) : null}
        {state.status === "ready" && state.items.length === 0 ? (
          <StateMessage kind="empty" message="Long-press a spot on the Home map to add a zone." title="No avoid zones" />
        ) : null}

        {state.items.map((zone) => (
          <Card key={zone.id} style={{ alignItems: "center", flexDirection: "row", gap: theme.space.md }}>
            <View style={{ flex: 1, gap: theme.space.xxs }}>
              <AppText variant="headline">{zoneName(zone)}</AppText>
              <AppText variant="subhead">{zone.radius_m} m radius</AppText>
            </View>
            <Button
              accessibilityLabel={`Delete ${zoneName(zone)}`}
              label="Delete"
              onPress={() => confirmDelete(zone)}
              variant="text"
            />
          </Card>
        ))}
        {error ? (
          <AppText style={{ color: theme.colors.error }} variant="callout">
            {error}
          </AppText>
        ) : null}
      </View>
    </Screen>
  );
}
