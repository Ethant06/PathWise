import { View, type ViewProps } from "react-native";

import { useTheme } from "../../theme";

export function Card({ style, ...props }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          padding: theme.space.lg,
        },
        theme.shadow.sm,
        style,
      ]}
      {...props}
    />
  );
}
