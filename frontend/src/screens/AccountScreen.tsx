import { Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme";
import type { UserPublic } from "../types";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Signed-in confirmation, styled after the Figma profile card. */
export function AccountScreen({ user, onLogOut }: { user: UserPublic; onLogOut: () => void }) {
  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      style={styles.flex}
    >
      <Text style={styles.headerEyebrow}>Signed in</Text>
      <Text style={styles.title}>Account</Text>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(user.name)}</Text>
        </View>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.name}>
            {user.name}
          </Text>
          <Text numberOfLines={1} style={styles.email}>
            {user.email}
          </Text>
        </View>
      </View>

      <Text style={styles.provider}>
        {user.auth_provider === "google" ? "Signed in with Google" : "Signed in with email"}
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={onLogOut}
        style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryPressed]}
      >
        <Text style={styles.secondaryLabel}>Log out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surface },
  screen: {
    paddingHorizontal: 20,
    paddingTop: (Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0) + 24,
    paddingBottom: 32,
  },
  headerEyebrow: {
    color: colors.teal,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  title: { color: colors.ink, fontSize: 24, fontWeight: "700", letterSpacing: -0.65 },
  card: {
    alignItems: "center",
    backgroundColor: colors.teal,
    borderRadius: 19,
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
    padding: 16,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.28)",
    borderRadius: 24,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  avatarText: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
  copy: { flex: 1 },
  name: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  email: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 4 },
  provider: { color: colors.muted, fontSize: 12, marginBottom: 18, marginTop: 12 },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
  },
  secondaryPressed: { backgroundColor: colors.surfaceSoft },
  secondaryLabel: { color: colors.teal, fontSize: 13, fontWeight: "700" },
});
