import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { searchPlaces } from "../api";
import { Glyph } from "../components/Glyph";
import { ScreenHeader } from "../components/ScreenHeader";
import { colors } from "../theme";
import type { PlaceHit } from "../types";

/** The API rejects queries shorter than this. */
const MIN_QUERY = 2;

type Results =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; places: PlaceHit[] }
  | { status: "error"; message: string };

/** The latest response, tagged with the query it answers. */
type Answer = { query: string } & ({ places: PlaceHit[] } | { message: string });

/**
 * Places directory. There is no Figma frame for it; it reuses the saved-route
 * card and header styles from the Figma file.
 */
export function PlacesScreen({
  onBack,
  onSelect,
}: {
  onBack: () => void;
  onSelect: (place: PlaceHit) => void;
}) {
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
            setAnswer({ query: q, message: e instanceof Error ? e.message : "Search failed." });
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
    <View style={styles.screen}>
      <ScreenHeader eyebrow="Places" onBack={onBack} title="Where to?" />

      <View style={styles.search}>
        <Glyph color={colors.mutedLight} name="pin" />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          clearButtonMode="while-editing"
          onChangeText={setQuery}
          placeholder="Search libraries, cafes, buildings"
          placeholderTextColor={colors.mutedLight}
          returnKeyType="search"
          style={styles.input}
          value={query}
        />
      </View>

      {results.status === "loading" && <ActivityIndicator color={colors.teal} style={styles.spinner} />}
      {results.status === "idle" && (
        <Text style={styles.hint}>Type at least {MIN_QUERY} letters to search.</Text>
      )}
      {results.status === "error" && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{results.message}</Text>
        </View>
      )}
      {results.status === "done" && (
        <FlatList
          contentContainerStyle={styles.list}
          data={results.places}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(place) => place.osm_id}
          ListEmptyComponent={<Text style={styles.hint}>No places match “{query.trim()}”.</Text>}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => onSelect(item)}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <View style={styles.icon}>
                <Glyph color={colors.blue} name="pin" />
              </View>
              <View style={styles.copy}>
                <Text numberOfLines={1} style={styles.name}>
                  {item.name}
                </Text>
                <Text style={styles.category}>{item.category}</Text>
                {item.opening_hours && (
                  <View style={styles.hoursRow}>
                    <View style={styles.dot} />
                    <Text numberOfLines={1} style={styles.hours}>
                      {item.opening_hours}
                    </Text>
                  </View>
                )}
              </View>
              <Glyph color={colors.mutedLight} name="chevron-right" />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: (Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0) + (Platform.OS === "ios" ? 60 : 24),
  },
  search: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
    marginTop: 16,
    minHeight: 54,
    paddingHorizontal: 15,
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  input: { color: colors.ink, flex: 1, fontSize: 14, fontWeight: "600", paddingVertical: 12 },
  spinner: { marginTop: 12 },
  hint: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 12 },
  errorBanner: { backgroundColor: colors.dangerSoft, borderRadius: 11, paddingHorizontal: 11, paddingVertical: 9 },
  errorText: { color: colors.danger, fontSize: 12, fontWeight: "600" },
  list: { gap: 11, paddingBottom: 24 },
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 15,
    shadowColor: colors.ink,
    shadowOpacity: 0.055,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  cardPressed: { backgroundColor: colors.surfaceSoft },
  icon: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 11,
    height: 39,
    justifyContent: "center",
    width: 39,
  },
  copy: { flex: 1, minWidth: 0 },
  name: { color: colors.ink, fontSize: 14, fontWeight: "700", marginBottom: 5 },
  category: { color: colors.muted, fontSize: 10, textTransform: "capitalize" },
  hoursRow: { alignItems: "center", flexDirection: "row", marginTop: 4 },
  dot: { backgroundColor: colors.teal, borderRadius: 2.5, height: 5, marginLeft: 1, marginRight: 6, width: 5 },
  hours: { color: colors.muted, flex: 1, fontSize: 10 },
});
