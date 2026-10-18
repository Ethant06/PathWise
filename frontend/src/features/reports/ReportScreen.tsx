import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Image, View } from "react-native";

import { ScreenHeader } from "../../components/ScreenHeader";
import { AppText } from "../../components/ui/AppText";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Chip } from "../../components/ui/Chip";
import { Screen } from "../../components/ui/Screen";
import { SampleDataNote } from "../../components/ui/StateMessage";
import { TextField } from "../../components/ui/TextField";
import { useTheme } from "../../theme";
import { errorText } from "../shared/collection";
import { REPORT_CATEGORIES, reports, reportsAreSample, reportsService } from "./service";
import type { ReportCategory, ReportPhoto } from "./types";

/**
 * Report a problem (4.5) at the walker's location or a long-pressed map point. Submitting needs
 * a login; the app only shows this screen to signed-in walkers.
 */
export function ReportScreen({
  point,
  where,
  onDone,
  onCancel,
}: {
  point: { lat: number; lng: number };
  where: "here" | "map";
  onDone: () => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<ReportPhoto | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickPhoto() {
    setError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError("Allow photo access to attach a picture, or send the report without one.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", quality: 0.6 });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      setPhoto({ uri: asset.uri, width: asset.width, height: asset.height, mime_type: asset.mimeType ?? null });
    } catch (e) {
      setError(errorText(e, "Could not open your photos."));
    }
  }

  async function send() {
    if (!category) return;
    setSending(true);
    setError(null);
    try {
      await reportsService().create({ category, lat: point.lat, lng: point.lng, note: note.trim() || undefined }, photo);
      await reports.refresh();
      setSent(true);
    } catch (e) {
      setError(errorText(e, "Could not send the report."));
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <Screen scroll>
        <View style={{ gap: theme.space.xl }}>
          <ScreenHeader eyebrow="Report" title="Thanks" />
          <AppText variant="body">
            {reportsAreSample()
              ? "Your report is saved on this phone and shows on your map. It is not sent to anyone until the backend is ready."
              : "Your report was sent. It shows on the map for other walkers for 7 days."}
          </AppText>
          <Button label="Back to the map" onPress={onDone} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={{ gap: theme.space.xl }}>
        <ScreenHeader eyebrow="Report" onBack={onCancel} title="What's wrong here?" />
        <AppText variant="subhead">
          {where === "here" ? "At your current location" : "At the spot you pressed on the map"} ({point.lat.toFixed(4)},{" "}
          {point.lng.toFixed(4)})
        </AppText>
        {reportsAreSample() ? <SampleDataNote label="Stays on this phone until the backend is ready" /> : null}

        <Card style={{ gap: theme.space.md }}>
          <AppText variant="headline">Category</AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.space.sm }}>
            {REPORT_CATEGORIES.map((item) => (
              <Chip key={item.value} label={item.label} onPress={() => setCategory(item.value)} selected={category === item.value} />
            ))}
          </View>
          <TextField
            label="Note (optional)"
            maxLength={280}
            multiline
            onChangeText={setNote}
            placeholder="Which corner, how long, anything that helps"
            style={{ height: 96, paddingTop: theme.space.md, textAlignVertical: "top" }}
            value={note}
          />
        </Card>

        <Card style={{ gap: theme.space.md }}>
          <AppText variant="headline">Photo (optional)</AppText>
          {photo ? (
            <Image
              accessibilityLabel="Photo attached to the report"
              source={{ uri: photo.uri }}
              style={{ aspectRatio: photo.width / Math.max(1, photo.height), borderRadius: theme.radius.md, width: "100%" }}
            />
          ) : null}
          <Button label={photo ? "Choose a different photo" : "Attach a photo"} onPress={() => void pickPhoto()} variant="secondary" />
          {photo ? <Button label="Remove photo" onPress={() => setPhoto(null)} variant="text" /> : null}
        </Card>

        {error ? (
          <AppText style={{ color: theme.colors.error }} variant="callout">
            {error}
          </AppText>
        ) : null}
        <Button disabled={!category} haptic="success" label="Send report" loading={sending} onPress={() => void send()} />
      </View>
    </Screen>
  );
}
