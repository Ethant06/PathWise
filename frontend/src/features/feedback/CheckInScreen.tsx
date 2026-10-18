import { useState } from "react";
import { View } from "react-native";

import { ScreenHeader } from "../../components/ScreenHeader";
import { AppText } from "../../components/ui/AppText";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Chip } from "../../components/ui/Chip";
import { Screen } from "../../components/ui/Screen";
import { TextField } from "../../components/ui/TextField";
import { formatMinutes } from "../../format";
import { useTheme } from "../../theme";
import { errorText } from "../shared/collection";
import { routeChoiceLabel } from "../walks/format";
import type { NewWalk } from "../walks/types";
import type { FeedbackTag, FeltSafe, WalkFeedback } from "./types";

const FELT: { value: FeltSafe; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "mostly", label: "Mostly" },
  { value: "no", label: "No" },
];

export const FEEDBACK_TAGS: { value: FeedbackTag; label: string }[] = [
  { value: "well_lit", label: "Well lit" },
  { value: "busy", label: "Busy" },
  { value: "empty", label: "Empty" },
  { value: "construction", label: "Construction" },
  { value: "felt_followed", label: "Felt followed" },
  { value: "other", label: "Other" },
];

const RATINGS = [1, 2, 3, 4, 5] as const;

/**
 * Post-walk check-in (4.4). Every answer is optional except "felt safe", and Skip always works.
 * The answers are the walker's own and are never turned into a score.
 */
export function CheckInScreen({
  walk,
  saveError,
  onSubmit,
  onSkip,
}: {
  walk: NewWalk;
  /** Set when the walk itself could not be saved to history. */
  saveError: string | null;
  onSubmit: (feedback: WalkFeedback) => Promise<void>;
  onSkip: () => void;
}) {
  const theme = useTheme();
  const [felt, setFelt] = useState<FeltSafe | null>(null);
  const [rating, setRating] = useState<WalkFeedback["rating"]>();
  const [tags, setTags] = useState<FeedbackTag[]>([]);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTag(tag: FeedbackTag) {
    setTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));
  }

  async function submit() {
    if (!felt) return;
    setSending(true);
    setError(null);
    try {
      await onSubmit({ felt_safe: felt, rating, tags, comment });
    } catch (e) {
      setError(errorText(e, "Could not save your answers. You can skip and keep going."));
      setSending(false);
    }
  }

  return (
    <Screen scroll>
      <View style={{ gap: theme.space.xl }}>
        <ScreenHeader eyebrow={walk.ended_by === "arrived" ? "You arrived" : "Walk ended"} title="Quick check-in" />
        <AppText variant="subhead">
          {routeChoiceLabel(walk.route_choice)} route to {walk.destination.label ?? "your destination"} ·{" "}
          {formatMinutes(walk.actual_duration_min)}
        </AppText>
        {saveError ? (
          <AppText style={{ color: theme.colors.error }} variant="callout">
            {saveError}
          </AppText>
        ) : null}

        <Card style={{ gap: theme.space.md }}>
          <AppText variant="headline">Did you feel safe on this walk?</AppText>
          <View accessibilityRole="radiogroup" style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.space.sm }}>
            {FELT.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                onPress={() => setFelt(option.value)}
                selected={felt === option.value}
              />
            ))}
          </View>
        </Card>

        <Card style={{ gap: theme.space.md }}>
          <AppText variant="headline">Rate the walk (optional)</AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.space.sm }}>
            {RATINGS.map((value) => (
              <Chip
                key={value}
                label={`${value}`}
                onPress={() => setRating((current) => (current === value ? undefined : value))}
                selected={rating === value}
              />
            ))}
          </View>
          <AppText variant="caption">1 is poor, 5 is great. Only you see this.</AppText>
        </Card>

        <Card style={{ gap: theme.space.md }}>
          <AppText variant="headline">What was it like? (optional)</AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.space.sm }}>
            {FEEDBACK_TAGS.map((tag) => (
              <Chip
                key={tag.value}
                label={tag.label}
                onPress={() => toggleTag(tag.value)}
                selected={tags.includes(tag.value)}
              />
            ))}
          </View>
          <TextField
            accessibilityLabel="Comment"
            label="Comment (optional)"
            maxLength={500}
            multiline
            onChangeText={setComment}
            placeholder="Anything you want to remember"
            style={{ height: 96, paddingTop: theme.space.md, textAlignVertical: "top" }}
            value={comment}
          />
        </Card>

        {error ? (
          <AppText style={{ color: theme.colors.error }} variant="callout">
            {error}
          </AppText>
        ) : null}
        <View style={{ gap: theme.space.sm }}>
          <Button disabled={!felt} haptic="success" label="Save" loading={sending} onPress={() => void submit()} />
          <Button label="Skip" onPress={onSkip} variant="text" />
        </View>
        <AppText variant="caption">Your answers stay private. PathWise never turns them into a score.</AppText>
      </View>
    </Screen>
  );
}
