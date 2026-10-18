import { Image, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme";

/**
 * Logo and title for the login and home screens.
 * Replace frontend/assets/logo.png with your own PNG and keep this filename.
 */
const logo = require("../../assets/logo.png");

export function BrandBlock({ tagline }: { tagline: string }) {
  return (
    <View style={styles.block}>
      <Image accessibilityLabel="PathWise" resizeMode="contain" source={logo} style={styles.logo} />
      <Text style={styles.tagline}>{tagline}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { alignItems: "flex-start", gap: 8 },
  logo: { height: 64, width: 256 },
  tagline: { fontSize: 13, color: colors.muted },
});
