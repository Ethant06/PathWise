import { useState } from "react";
import { TextInput, View, type TextInputProps } from "react-native";

import { useTheme } from "../../theme";
import { AppText } from "./AppText";

export function TextField({ label, error, style, ...input }: TextInputProps & { label: string; error?: string | null }) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: theme.space.sm }}>
      <AppText variant="subhead">{label}</AppText>
      <TextInput
        placeholderTextColor={theme.colors.textTertiary}
        style={[
          {
            backgroundColor: theme.colors.surfaceAlt,
            borderColor: error ? theme.colors.error : focused ? theme.colors.primary : "transparent",
            borderRadius: theme.radius.md,
            borderWidth: 2,
            height: theme.size.input,
            paddingHorizontal: theme.space.lg,
            ...theme.type.body,
            color: theme.colors.textPrimary,
          },
          style,
        ]}
        onBlur={(event) => {
          setFocused(false);
          input.onBlur?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          input.onFocus?.(event);
        }}
        {...input}
      />
      {error ? <AppText style={{ color: theme.colors.error }} variant="caption">{error}</AppText> : null}
    </View>
  );
}
