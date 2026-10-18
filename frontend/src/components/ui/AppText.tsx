import { Text, type TextProps, type TextStyle } from "react-native";

import { useTheme, type Theme } from "../../theme";

type Variant = keyof Theme["type"];

export function AppText({
  variant = "body",
  color,
  style,
  ...props
}: TextProps & { variant?: Variant; color?: string }) {
  const theme = useTheme();
  const type = theme.type[variant] as TextStyle;
  return <Text style={[type, color ? { color } : null, style]} {...props} />;
}
