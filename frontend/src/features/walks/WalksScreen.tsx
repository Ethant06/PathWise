import { useState } from "react";
import { Alert, Pressable, View } from "react-native";

import { Glyph } from "../../components/Glyph";
import { AppText } from "../../components/ui/AppText";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Screen } from "../../components/ui/Screen";
import { SampleDataNote, StateMessage } from "../../components/ui/StateMessage";
import { formatMiles, formatMinutes } from "../../format";
import { useTheme } from "../../theme";
import { errorText } from "../shared/collection";
import { commutes, COMMUTE_MIN_WALKS, endpointLabel, formatClock, formatDay, routeChoiceLabel } from "./format";
import { sampleWalks } from "./mock";
import { walks, walksAreLocal, walksService } from "./service";
import type { Walk } from "./types";

function WalkRow({ walk, onPress }: { walk: Walk; onPress: () => void }) {
  const theme = useTheme();
  const from = endpointLabel(walk.origin, "Start");
  const to = endpointLabel(walk.destination, "Destination");
  return (
    <Pressable
      accessibilityHint="Opens the walk"
      accessibilityLabel={`${formatDay(walk.started_at)}, ${from} to ${to}, ${formatMinutes(walk.actual_duration_min)}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        {
          alignItems: "center",
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          flexDirection: "row",
          gap: theme.space.md,
          minHeight: 64,
          padding: theme.space.lg,
        },
        theme.shadow.sm,
        pressed && { transform: [{ scale: theme.motion.pressScale }] },
      ]}
    >
      <View style={{ flex: 1, gap: theme.space.xs }}>
        <AppText variant="overline">
          {formatDay(walk.started_at)} · {formatClock(walk.started_at)}–{formatClock(walk.ended_at)}
        </AppText>
        <AppText numberOfLines={1} variant="headline">
          {from} → {to}
        </AppText>
        <AppText variant="subhead">
          {formatMinutes(walk.actual_duration_min)} · {formatMiles(walk.planned_distance_m)} planned ·{" "}
          {routeChoiceLabel(walk.route_choice)}
          {walk.ended_by === "user" ? " · ended early" : ""}
        </AppText>
      </View>
      <Glyph color={theme.colors.textTertiary} name="chevron-right" />
    </Pressable>
  );
}

/** Route history (4.3): past walks, typical commute times, and delete controls. */
export function WalksScreen({ onOpen }: { onOpen: (walk: Walk) => void }) {
  const theme = useTheme();
  const state = walks.use();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const local = walksAreLocal();
  const typical = commutes(state.items);

  function confirmDeleteAll() {
    Alert.alert("Delete all history?", "This removes every walk and its check-in. It cannot be undone.", [
      { style: "cancel", text: "Cancel" },
      {
        style: "destructive",
        text: "Delete all",
        onPress: () => {
          setBusy(true);
          setActionError(null);
          walksService()
            .removeAll()
            .then(() => walks.set([]))
            .catch((e: unknown) => setActionError(errorText(e, "Could not delete your history.")))
            .finally(() => setBusy(false));
        },
      },
    ]);
  }

  async function addSamples() {
    setBusy(true);
    setActionError(null);
    try {
      for (const walk of sampleWalks()) await walksService().create(walk);
      await walks.refresh();
    } catch (e) {
      setActionError(errorText(e, "Could not add sample walks."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll>
      <View style={{ gap: theme.space.xl }}>
        <View style={{ gap: theme.space.xs }}>
          <AppText variant="overline">History</AppText>
          <AppText variant="title1">Your walks</AppText>
          <AppText variant="subhead">
            {local ? "Stored on this phone only." : "Synced to your account."} The GPS trace is not kept, only the
            planned route.
          </AppText>
        </View>

        {state.status === "loading" && state.items.length === 0 ? <StateMessage kind="loading" message="Loading walks" /> : null}
        {state.status === "error" ? (
          <StateMessage actionLabel="Try again" kind="error" message={state.error} onAction={() => void walks.refresh()} />
        ) : null}
        {state.status === "ready" && state.items.length === 0 ? (
          <StateMessage
            kind="empty"
            message="Start a walk from the routes screen. When it ends, it shows up here."
            title="No walks yet"
          />
        ) : null}

        {typical.length > 0 ? (
          <Card style={{ gap: theme.space.md }}>
            <AppText variant="headline">Typical commute times</AppText>
            {typical.map((commute) => (
              <View key={commute.key} style={{ gap: theme.space.xxs }}>
                <AppText variant="callout">
                  {commute.from} → {commute.to}
                </AppText>
                <AppText variant="subhead">
                  Usually {formatMinutes(commute.medianMin)} ({formatMinutes(commute.minMin)}–
                  {formatMinutes(commute.maxMin)}) over {commute.count} walks
                </AppText>
              </View>
            ))}
          </Card>
        ) : state.items.length > 0 ? (
          <AppText variant="caption">
            Typical times appear after {COMMUTE_MIN_WALKS} finished walks between the same two saved places.
          </AppText>
        ) : null}

        <View style={{ gap: theme.space.md }}>
          {state.items.map((walk) => (
            <WalkRow key={walk.id} onPress={() => onOpen(walk)} walk={walk} />
          ))}
        </View>

        {actionError ? (
          <AppText style={{ color: theme.colors.error }} variant="callout">
            {actionError}
          </AppText>
        ) : null}
        {state.items.length > 0 ? (
          <Button disabled={busy} label="Delete all history" onPress={confirmDeleteAll} variant="destructive" />
        ) : null}
        {__DEV__ && local ? (
          <View style={{ gap: theme.space.sm }}>
            <SampleDataNote label="Developer only" />
            <Button
              disabled={busy}
              label="Add 3 sample walks"
              onPress={() => void addSamples()}
              variant="text"
            />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
