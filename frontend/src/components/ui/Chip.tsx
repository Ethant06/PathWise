import * as Haptics from "expo-haptics";
import { Pressable } from "react-native";

import { useTheme } from "../../theme";
import { AppText } from "./AppText";

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surfaceAlt,
          borderRadius: theme.radius.full,
          height: theme.size.chip,
          justifyContent: "center",
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
