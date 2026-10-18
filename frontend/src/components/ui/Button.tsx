import * as Haptics from "expo-haptics";
import { ActivityIndicator, Pressable, Text, type PressableProps, type TextStyle, type ViewStyle } from "react-native";

import { useTheme } from "../../theme";

type Variant = "primary" | "secondary" | "text" | "destructive";

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  haptic,
  ...rest
}: PressableProps & {
  label: string;
  variant?: Variant;
  loading?: boolean;
  haptic?: "light" | "medium" | "success";
}) {
  const theme = useTheme();
  const inactive = disabled || loading;
  const styles = variants(theme, variant);

  function press(event: Parameters<NonNullable<PressableProps["onPress"]>>[0]) {
    if (haptic === "light") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (haptic === "medium") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (haptic === "success") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onPress?.(event);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={press}
      style={({ pressed }) => [
        styles.button,
        pressed && { backgroundColor: styles.pressed, transform: [{ scale: theme.motion.pressScale }] },
        inactive && styles.inactive,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={styles.label.color} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}

function variants(theme: ReturnType<typeof useTheme>, variant: Variant): {
  button: ViewStyle;
  pressed: string;
  inactive: ViewStyle;
  label: TextStyle;
} {
  const shared: ViewStyle = {
    alignItems: "center",
    borderRadius: theme.radius.md,
    height: theme.size.buttonLg,
    justifyContent: "center",
    paddingHorizontal: theme.space.xl,
  };
  const labelBase: TextStyle = { ...theme.type.headline };
  if (variant === "primary") {
    return {
      button: { ...shared, backgroundColor: theme.colors.primary },
      pressed: theme.colors.primaryPressed,
      inactive: { opacity: 0.4 },
      label: { ...labelBase, color: theme.colors.onPrimary },
    };
  }
  if (variant === "secondary") {
    return {
      button: { ...shared, backgroundColor: theme.colors.primarySoft },
      pressed: theme.colors.border,
      inactive: { opacity: 0.4 },
      label: { ...labelBase, color: theme.colors.primary },
    };
  }
  if (variant === "destructive") {
    return {
      button: { ...shared, backgroundColor: theme.colors.surfaceAlt },
      pressed: theme.colors.border,
      inactive: { opacity: 0.4 },
      label: { ...theme.type.callout, color: theme.colors.error },
    };
  }
  return {
    button: { ...shared, backgroundColor: "transparent", height: theme.size.buttonMd },
    pressed: "transparent",
    inactive: { opacity: 0.4 },
    label: { ...theme.type.callout, color: theme.colors.primary },
  };
}
