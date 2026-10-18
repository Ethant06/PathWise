import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from "react-native";

import { searchPlaces } from "../api";
import { Glyph } from "../components/Glyph";
import { ScreenHeader } from "../components/ScreenHeader";
import { AppText } from "../components/ui/AppText";
import { Screen } from "../components/ui/Screen";
import { useTheme } from "../theme";
import type { PlaceHit } from "../types";

const MIN_QUERY = 2;

type Results =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; places: PlaceHit[] }
  | { status: "error"; message: string };

type Answer = { query: string } & ({ places: PlaceHit[] } | { message: string });

export function PlacesScreen({
  onBack,
  onSelect,
}: {
  onBack: () => void;
  onSelect: (place: PlaceHit) => void;
}) {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const q = query.trim();

  useEffect(() => {
    if (q.length < MIN_QUERY) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchPlaces(q)
        .then((places) => {
          if (!cancelled) setAnswer({ query: q, places });
        })
        .catch((e: unknown) => {
          if (!cancelled) {
            setAnswer({ query: q, message: e instanceof Error ? e.message : "Search didn't go through. Try again." });
          }
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  let results: Results;
  if (q.length < MIN_QUERY) {
    results = { status: "idle" };
  } else if (!answer || answer.query !== q) {
    results = { status: "loading" };
  } else if ("places" in answer) {
    results = { status: "done", places: answer.places };
  } else {
    results = { status: "error", message: answer.message };
  }

  return (
    <Screen>
      <View style={{ gap: theme.space.lg, flex: 1 }}>
        <ScreenHeader eyebrow="Places" onBack={onBack} title="Where to?" />
        <View
          style={{
            alignItems: "center",
            backgroundColor: theme.colors.surfaceAlt,
            borderRadius: theme.radius.md,
            flexDirection: "row",
            gap: theme.space.sm,
            height: 52,
            paddingHorizontal: theme.space.lg,
          }}
        >
          <Glyph color={theme.colors.textTertiary} name="pin" />
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            clearButtonMode="while-editing"
            onChangeText={setQuery}
            placeholder="Libraries, cafes, buildings"
            placeholderTextColor={theme.colors.textTertiary}
            returnKeyType="search"
            style={{ flex: 1, ...theme.type.body, color: theme.colors.textPrimary }}
            value={query}
          />
        </View>
        {results.status === "loading" ? <ActivityIndicator color={theme.colors.primary} /> : null}
        {results.status === "idle" ? (
          <AppText variant="subhead">Type at least {MIN_QUERY} letters.</AppText>
        ) : null}
        {results.status === "error" ? (
          <AppText style={{ color: theme.colors.error }} variant="callout">
            {results.message}
          </AppText>
        ) : null}
        {results.status === "done" ? (
          <FlatList
            contentContainerStyle={{ gap: theme.space.md, paddingBottom: theme.space.xxl }}
            data={results.places}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(place) => place.osm_id}
            ListEmptyComponent={
              <AppText variant="subhead">No places match “{query.trim()}”. Try a shorter name.</AppText>
            }
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() => onSelect(item)}
                style={({ pressed }) => [
                  {
                    alignItems: "center",
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radius.lg,
                    borderWidth: 1,
                    flexDirection: "row",
                    gap: theme.space.md,
                    minHeight: 56,
                    padding: theme.space.lg,
                  },
                  theme.shadow.sm,
                  pressed && { transform: [{ scale: theme.motion.pressScale }] },
                ]}
              >
                <View
                  style={{
                    alignItems: "center",
                    backgroundColor: theme.colors.primarySoft,
                    borderRadius: theme.radius.full,
                    height: 36,
                    justifyContent: "center",
                    width: 36,
                  }}
                >
                  <Glyph color={theme.colors.primary} name="pin" />
                </View>
                <View style={{ flex: 1, gap: theme.space.xs }}>
                  <AppText numberOfLines={1} variant="headline">
                    {item.name}
                  </AppText>
                  <AppText style={{ textTransform: "capitalize" }} variant="subhead">
                    {item.category}
                  </AppText>
                  {item.opening_hours ? <AppText numberOfLines={1} variant="caption">{item.opening_hours}</AppText> : null}
                </View>
                <Glyph color={theme.colors.textTertiary} name="chevron-right" />
              </Pressable>
            )}
          />
        ) : null}
      </View>
    </Screen>
  );
}
