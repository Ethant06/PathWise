import { useState } from "react";
import { View } from "react-native";

import { askWalkBuddy, type WalkBuddy } from "../api";
import { ScreenHeader } from "../components/ScreenHeader";
import { AppText } from "../components/ui/AppText";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Screen } from "../components/ui/Screen";
import { TextField } from "../components/ui/TextField";
import { useTheme } from "../theme";
import type { PlaceHit } from "../types";

export function WalkBuddyScreen({
  latitude,
  longitude,
  onBack,
  onStartRoute,
}: {
  latitude: number;
  longitude: number;
  onBack: () => void;
  onStartRoute: (place: PlaceHit) => Promise<void>;
}) {
  const theme = useTheme();
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<WalkBuddy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);

  async function ask() {
    const trimmed = question.trim();
    if (!trimmed) {
      setError("Ask for a walk first.");
      return;
    }
    setPending(true);
    setError(null);
    setResult(null);
    try {
      setResult(await askWalkBuddy({ question: trimmed, lat: latitude, lng: longitude }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Walk Buddy did not answer.");
    } finally {
      setPending(false);
    }
  }

  async function start(place: PlaceHit) {
    setStarting(place.osm_id);
    setError(null);
    try {
      await onStartRoute(place);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not find routes.");
    } finally {
      setStarting(null);
    }
  }

  const places = result?.places ?? [];

  return (
    <Screen scroll>
      <View style={{ gap: theme.space.lg }}>
        <ScreenHeader eyebrow="Walk Buddy" onBack={onBack} title="Ask for a walk" />
        <AppText variant="body">Ask from where you are now. A clear place can open the route.</AppText>
        <TextField
          label="Question"
          multiline
          onChangeText={setQuestion}
          onSubmitEditing={() => void ask()}
          placeholder="A quiet walk to Odegaard"
          value={question}
          style={{ height: theme.size.fab * 2, paddingTop: theme.space.md, textAlignVertical: "top" }}
        />
        <Button disabled={pending || starting !== null} label="Ask" loading={pending} onPress={() => void ask()} />
        {error ? (
          <AppText style={{ color: theme.colors.error }} variant="callout">
            {error}
          </AppText>
        ) : null}
        {result ? (
          <Card style={{ gap: theme.space.md }}>
            <AppText variant="body">{result.answer}</AppText>
            {places.map((place) => (
              <Button
                key={place.osm_id}
                disabled={starting !== null}
                label={`Walk to ${place.name}`}
                loading={starting === place.osm_id}
                onPress={() => void start(place)}
                variant="secondary"
              />
            ))}
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}
