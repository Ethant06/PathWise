import { View } from "react-native";

import { useTheme, uw } from "../../theme";

export function UserDot() {
  const theme = useTheme();
  return (
    <View
      style={{
        alignItems: "center",
        height: theme.size.avatar.md,
        justifyContent: "center",
        width: theme.size.avatar.md,
      }}
    >
      <View
        style={{
          backgroundColor: theme.colors.locationHalo,
          borderRadius: theme.radius.full,
          height: theme.size.avatar.md,
          position: "absolute",
          width: theme.size.avatar.md,
        }}
      />
      <View
        style={{
          backgroundColor: theme.colors.primary,
          borderColor: theme.colors.surface,
          borderRadius: theme.radius.full,
          borderWidth: theme.space.xxs,
          height: theme.size.icon.sm,
          width: theme.size.icon.sm,
        }}
      />
    </View>
  );
}

export function DestinationPin() {
  const theme = useTheme();
  return (
    <View
      style={{
        backgroundColor: theme.colors.highlight,
        borderColor: uw.huskyPurple,
        borderRadius: theme.radius.full,
        borderWidth: theme.space.xxs,
        height: theme.size.icon.lg,
        width: theme.size.icon.lg,
      }}
    />
  );
}
