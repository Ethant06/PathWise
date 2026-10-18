import * as Haptics from "expo-haptics";
import { Pressable } from "react-native";

import { useTheme } from "../../theme";
import { AppText } from "./AppText";

export function Chip({
  label,
  selected,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      // The chip is drawn 32 pt tall; vertical slop makes the tap target 44 pt without
      // overlapping the chip beside it.
      hitSlop={{ top: (theme.size.touchMin - theme.size.chip) / 2, bottom: (theme.size.touchMin - theme.size.chip) / 2 }}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          alignItems: "center",
          backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surfaceAlt,
          borderRadius: theme.radius.full,
          height: theme.size.chip,
          justifyContent: "center",
          minWidth: theme.size.touchMin,
          paddingHorizontal: theme.space.md,
        },
        pressed && { transform: [{ scale: theme.motion.pressScale }] },
      ]}
    >
      <AppText color={selected ? theme.colors.primary : theme.colors.textSecondary} variant="caption">
        {label}
      </AppText>
    </Pressable>
  );
}
