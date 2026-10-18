import { useState } from "react";
import { View } from "react-native";

import { askWalkBuddy } from "../api";
import { ScreenHeader } from "../components/ScreenHeader";
import { AppText } from "../components/ui/AppText";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Screen } from "../components/ui/Screen";
import { TextField } from "../components/ui/TextField";
import { useTheme } from "../theme";

export function WalkBuddyScreen({
  latitude,
  longitude,
  onBack,
}: {
  latitude: number;
  longitude: number;
  onBack: () => void;
}) {
  const theme = useTheme();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function ask() {
    const trimmed = question.trim();
    if (!trimmed) {
      setError("Ask for a walk first.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await askWalkBuddy({ question: trimmed, lat: latitude, lng: longitude });
      setAnswer(result.answer);
    } catch (caught) {
      setAnswer(null);
      setError(caught instanceof Error ? caught.message : "Walk Buddy did not answer.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen scroll>
      <View style={{ gap: theme.space.lg }}>
        <ScreenHeader eyebrow="Walk Buddy" onBack={onBack} title="Ask for a walk" />
        <AppText variant="body">Tell it where you want to go from where you are now.</AppText>
        <TextField
          label="Question"
          multiline
          onChangeText={setQuestion}
          onSubmitEditing={() => void ask()}
          placeholder="A quiet 20-minute walk to study"
          value={question}
          style={{ height: theme.size.fab * 2, paddingTop: theme.space.md, textAlignVertical: "top" }}
        />
        <Button disabled={pending} label="Ask" loading={pending} onPress={() => void ask()} />
        {error ? (
          <AppText style={{ color: theme.colors.error }} variant="callout">
            {error}
          </AppText>
        ) : null}
        {answer ? (
          <Card>
            <AppText variant="body">{answer}</AppText>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}
