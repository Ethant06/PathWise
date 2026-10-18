import { ActivityIndicator, View } from "react-native";

import { useTheme } from "../../theme";
import { AppText } from "./AppText";
import { Button } from "./Button";
import { Card } from "./Card";

type Kind = "loading" | "empty" | "error" | "unavailable";

/**
 * The four states every feature screen handles. "unavailable" is for features the backend
 * does not support yet; say so plainly instead of pretending the feature works.
 */
export function StateMessage({
  kind,
  title,
  message,
  actionLabel,
  onAction,
}: {
  kind: Kind;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();
  if (kind === "loading") {
    return (
      <View accessibilityLabel={message ?? "Loading"} style={{ alignItems: "center", padding: theme.space.xl }}>
        <ActivityIndicator color={theme.colors.primary} />
        {message ? <AppText variant="subhead">{message}</AppText> : null}
      </View>
    );
  }
  const defaults: Record<Exclude<Kind, "loading">, string> = {
    empty: "Nothing here yet",
    error: "Something went wrong",
    unavailable: "Not available yet",
  };
  return (
    <Card style={{ gap: theme.space.sm }}>
      <AppText color={kind === "error" ? theme.colors.error : theme.colors.textPrimary} variant="headline">
        {title ?? defaults[kind]}
      </AppText>
      {message ? <AppText variant="subhead">{message}</AppText> : null}
      {actionLabel && onAction ? (
        <Button
          accessibilityLabel={actionLabel}
          label={actionLabel}
          onPress={onAction}
          variant={kind === "error" ? "secondary" : "text"}
        />
      ) : null}
    </Card>
  );
}

/** Small label shown next to anything that comes from sample data instead of the server. */
export function SampleDataNote({ label = "Sample data, not live yet" }: { label?: string }) {
  const theme = useTheme();
  return (
    <View
      accessibilityLabel={label}
      style={{
        alignSelf: "flex-start",
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: theme.radius.full,
        paddingHorizontal: theme.space.sm,
        paddingVertical: theme.space.xxs,
      }}
    >
      <AppText color={theme.colors.textSecondary} variant="caption">
        {label}
      </AppText>
    </View>
  );
}
