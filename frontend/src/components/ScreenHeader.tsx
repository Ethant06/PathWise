import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme";
import { Glyph } from "./Glyph";

/** Back button, teal eyebrow, and title from the Figma route screen header. */
export function ScreenHeader({
  eyebrow,
  title,
  onBack,
}: {
  eyebrow?: string;
  title: string;
  onBack?: () => void;
}) {
  return (
    <View style={styles.header}>
      {onBack && (
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={onBack}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Glyph color={colors.ink} name="chevron-left" />
        </Pressable>
      )}
      <View style={styles.copy}>
        {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
        <Text style={styles.title}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 46 },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  pressed: { backgroundColor: colors.line },
  copy: { flex: 1 },
  eyebrow: {
    color: colors.teal,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  title: { color: colors.ink, fontSize: 24, fontWeight: "700", letterSpacing: -0.65 },
});
