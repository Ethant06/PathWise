import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme";

/** SafePath logo row from the Figma home screen. */
export function BrandBlock({ tagline }: { tagline: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.mark}>
        {/* Check mark drawn with borders; no SVG library is installed. */}
        <View style={styles.check} />
      </View>
      <View>
        <Text style={styles.name}>SafePath</Text>
        <Text style={styles.tagline}>{tagline}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  mark: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.teal,
    shadowOpacity: 0.22,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  check: {
    width: 11,
    height: 19,
    marginTop: -4,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: "#ffffff",
    borderRadius: 1,
    transform: [{ rotate: "45deg" }],
  },
  name: { fontSize: 23, fontWeight: "800", letterSpacing: -0.6, color: colors.ink },
  tagline: { fontSize: 13, color: colors.muted, marginTop: 4 },
});
