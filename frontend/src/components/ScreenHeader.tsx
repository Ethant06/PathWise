import { Pressable, View } from "react-native";

import { useTheme } from "../theme";
import { Glyph } from "./Glyph";
import { AppText } from "./ui/AppText";

export function ScreenHeader({
  eyebrow,
  title,
  onBack,
}: {
  eyebrow?: string;
  title: string;
  onBack?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: "center", flexDirection: "row", gap: theme.space.md, minHeight: theme.size.touchMin }}>
      {onBack ? (
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={theme.space.sm}
          onPress={onBack}
          style={({ pressed }) => [
            {
              alignItems: "center",
              backgroundColor: theme.colors.surfaceAlt,
              borderRadius: theme.radius.full,
              height: theme.size.iconButton,
              justifyContent: "center",
              width: theme.size.iconButton,
            },
            pressed && { transform: [{ scale: theme.motion.pressScale }] },
          ]}
        >
          <Glyph color={theme.colors.textPrimary} name="chevron-left" />
        </Pressable>
      ) : null}
      <View style={{ flex: 1, gap: theme.space.xs }}>
        {eyebrow ? <AppText variant="overline">{eyebrow}</AppText> : null}
        <AppText variant="title1">{title}</AppText>
      </View>
    </View>
  );
}
