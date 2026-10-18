import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme";
import { Glyph, type GlyphName } from "./Glyph";

export type Tab = "home" | "profile";

// The Figma nav also has "Saved". It is left out: the API has no saved routes.
const ITEMS: { tab: Tab; label: string; glyph: GlyphName }[] = [
  { tab: "home", label: "Home", glyph: "home" },
  { tab: "profile", label: "Profile", glyph: "person" },
];

export function BottomNav({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <View accessibilityRole="tablist" style={styles.nav}>
      {ITEMS.map((item) => {
        const active = item.tab === tab;
        const color = active ? colors.teal : colors.mutedLight;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            key={item.tab}
            onPress={() => onChange(item.tab)}
            style={styles.item}
          >
            <Glyph color={color} name={item.glyph} />
            <Text style={[styles.label, { color }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    height: 83,
    paddingBottom: 20,
    paddingHorizontal: 31,
    paddingTop: 8,
  },
  item: { alignItems: "center", flex: 1, gap: 4, padding: 5 },
  label: { fontSize: 10, fontWeight: "600" },
});
