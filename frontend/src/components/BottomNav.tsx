import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../theme";
import { Glyph, type GlyphName } from "./Glyph";
import { AppText } from "./ui/AppText";

export type Tab = "home" | "profile";

const ITEMS: { tab: Tab; label: string; glyph: GlyphName }[] = [
  { tab: "home", label: "Home", glyph: "home" },
  { tab: "profile", label: "Profile", glyph: "person" },
];

export function BottomNav({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        backgroundColor: theme.colors.surface,
        borderTopColor: theme.colors.border,
        borderTopWidth: 1,
        flexDirection: "row",
        height: theme.size.tabBar + insets.bottom,
        paddingBottom: insets.bottom,
        paddingTop: theme.space.sm,
      }}
    >
      {ITEMS.map((item) => {
        const active = item.tab === tab;
        const color = active ? theme.colors.primary : theme.colors.textTertiary;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            key={item.tab}
            onPress={() => onChange(item.tab)}
            style={{ alignItems: "center", flex: 1, gap: theme.space.xs, justifyContent: "center", minHeight: 44 }}
          >
            <Glyph color={color} name={item.glyph} />
            <AppText color={color} variant="overline">
              {item.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
