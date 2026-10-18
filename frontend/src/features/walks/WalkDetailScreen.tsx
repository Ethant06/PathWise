import { useRef, useState } from "react";
import { Alert, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

import { ScreenHeader } from "../../components/ScreenHeader";
import { AppText } from "../../components/ui/AppText";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Screen } from "../../components/ui/Screen";
import { StateMessage } from "../../components/ui/StateMessage";
import { formatMiles, formatMinutes, toLatLngs } from "../../format";
import { mapStroke, mutedMapStyle, useTheme } from "../../theme";
import { FEEDBACK_TAGS } from "../feedback/CheckInScreen";
import type { FeltSafe } from "../feedback/types";
import { errorText } from "../shared/collection";
import { commuteFor, commutes, endpointLabel, formatClock, formatDay, routeChoiceLabel } from "./format";
import { walks, walksService } from "./service";

const FELT_TEXT: Record<FeltSafe, string> = { yes: "Yes", mostly: "Mostly", no: "No" };

/** One past walk: the planned line on the map, times, and the walker's check-in. */
export function WalkDetailScreen({ walkId, onBack }: { walkId: string; onBack: () => void }) {
  const theme = useTheme();
  const mapRef = useRef<MapView>(null);
  const state = walks.use();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const walk = state.items.find((item) => item.id === walkId);

  if (!walk) {
    return (
      <Screen>
        <View style={{ gap: theme.space.lg }}>
          <ScreenHeader eyebrow="Walk" onBack={onBack} title="Walk not found" />
          <StateMessage kind="empty" message="This walk was deleted." />
        </View>
      </Screen>
    );
  }

  const line = toLatLngs(walk.geometry);
  const color = walk.route_choice === "fastest" ? theme.colors.routeFastest : theme.colors.routeSafer;
  const commute = commuteFor(walk, commutes(state.items));
  const feedback = walk.feedback;
  const tagLabels = feedback?.tags.map((tag) => FEEDBACK_TAGS.find((item) => item.value === tag)?.label ?? tag) ?? [];

  function confirmDelete() {
    Alert.alert("Delete this walk?", "Its check-in is deleted too.", [
      { style: "cancel", text: "Cancel" },
      {
        style: "destructive",
        text: "Delete",
        onPress: () => {
          setDeleting(true);
          setError(null);
          walksService()
            .remove(walkId)
            .then(() => {
              walks.set(walks.get().items.filter((item) => item.id !== walkId));
              onBack();
            })
            .catch((e: unknown) => {
              setError(errorText(e, "Could not delete this walk."));
              setDeleting(false);
            });
        },
      },
    ]);
  }

  return (
    <Screen scroll>
      <View style={{ gap: theme.space.lg }}>
        <ScreenHeader eyebrow={formatDay(walk.started_at)} onBack={onBack} title={endpointLabel(walk.destination, "Walk")} />
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
            onMapReady={() =>
              mapRef.current?.fitToCoordinates(line, {
                animated: false,
                edgePadding: { top: theme.space.xxl, right: theme.space.xxl, bottom: theme.space.xxl, left: theme.space.xxl },
              })
            }
            ref={mapRef}
            showsCompass={false}
            showsPointsOfInterests={false}
            style={{ flex: 1 }}
            userInterfaceStyle={theme.isDark ? "dark" : "light"}
          >
            {line.length > 1 ? (
              <Polyline coordinates={line} lineCap="round" lineJoin="round" strokeColor={color} strokeWidth={mapStroke.walked} />
            ) : null}
            {line[0] ? <Marker coordinate={line[0]} pinColor={theme.colors.primary} title={endpointLabel(walk.origin, "Start")} /> : null}
            {line.length > 1 ? (
              <Marker
                coordinate={line[line.length - 1]}
                pinColor={theme.colors.routeSafer}
                title={endpointLabel(walk.destination, "Destination")}
              />
            ) : null}
          </MapView>
        </View>
        <AppText variant="caption">The planned line when the walk started. Your GPS trace is not stored.</AppText>

        <Card style={{ gap: theme.space.sm }}>
          <AppText variant="headline">
            {endpointLabel(walk.origin, "Start")} → {endpointLabel(walk.destination, "Destination")}
          </AppText>
          <AppText variant="subhead">
            {formatClock(walk.started_at)}–{formatClock(walk.ended_at)} · {formatMinutes(walk.actual_duration_min)} actual
          </AppText>
          <AppText variant="subhead">
            {routeChoiceLabel(walk.route_choice)} route · planned {formatMinutes(walk.planned_duration_min)},{" "}
            {formatMiles(walk.planned_distance_m)}
          </AppText>
          {walk.ended_by === "user" ? <AppText variant="caption">Ended before arriving.</AppText> : null}
          {commute ? (
            <AppText variant="caption">
              This commute usually takes {formatMinutes(commute.medianMin)} ({formatMinutes(commute.minMin)}–
              {formatMinutes(commute.maxMin)}, {commute.count} walks).
            </AppText>
          ) : null}
        </Card>

        <Card style={{ gap: theme.space.sm }}>
          <AppText variant="headline">Your check-in</AppText>
          {feedback ? (
            <>
              <AppText variant="subhead">Felt safe: {FELT_TEXT[feedback.felt_safe]}</AppText>
              {feedback.rating ? <AppText variant="subhead">Your rating: {feedback.rating} of 5</AppText> : null}
              {tagLabels.length ? <AppText variant="subhead">{tagLabels.join(", ")}</AppText> : null}
              {feedback.comment ? <AppText variant="body">“{feedback.comment}”</AppText> : null}
            </>
          ) : (
            <AppText variant="subhead">Skipped.</AppText>
          )}
        </Card>

        {error ? (
          <AppText style={{ color: theme.colors.error }} variant="callout">
            {error}
          </AppText>
        ) : null}
        <Button disabled={deleting} label="Delete this walk" onPress={confirmDelete} variant="destructive" />
      </View>
    </Screen>
  );
}
