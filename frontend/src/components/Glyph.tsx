import { StyleSheet, View } from "react-native";

/**
 * Simple stand-ins for the Figma line icons, drawn with Views because no SVG
 * library is installed. Each glyph fits a 20×20 box.
 */
export type GlyphName =
  | "check"
  | "chevron-left"
  | "chevron-right"
  | "clock"
  | "home"
  | "person"
  | "pin"
  | "ring"
  | "route";

export function Glyph({ name, color }: { name: GlyphName; color: string }) {
  switch (name) {
    case "check":
      return (
        <View style={styles.box}>
          <View style={[styles.check, { borderColor: color }]} />
        </View>
      );
    case "chevron-left":
    case "chevron-right":
      return (
        <View style={styles.box}>
          <View
            style={[
              styles.chevron,
              { borderColor: color },
              name === "chevron-left" ? styles.left : styles.right,
            ]}
          />
        </View>
      );
    case "clock":
      return (
        <View style={styles.box}>
          <View style={[styles.ring, { borderColor: color }]}>
            <View style={[styles.clockHand, { backgroundColor: color }]} />
            <View style={[styles.clockHandShort, { backgroundColor: color }]} />
          </View>
        </View>
      );
    case "home":
      return (
        <View style={styles.box}>
          <View style={[styles.roof, { borderColor: color }]} />
          <View style={[styles.house, { borderColor: color }]} />
        </View>
      );
    case "person":
      return (
        <View style={styles.box}>
          <View style={[styles.head, { borderColor: color }]} />
          <View style={[styles.shoulders, { borderColor: color }]} />
        </View>
      );
    case "pin":
      return (
        <View style={styles.box}>
          <View style={[styles.pin, { borderColor: color }]}>
            <View style={[styles.pinDot, { backgroundColor: color }]} />
          </View>
        </View>
      );
    case "ring":
      return (
        <View style={styles.box}>
          <View style={[styles.ring, { borderColor: color }]}>
            <View style={[styles.ringDot, { backgroundColor: color }]} />
          </View>
        </View>
      );
    case "route":
      return (
        <View style={styles.box}>
          <View style={[styles.routeDot, styles.routeTop, { borderColor: color }]} />
          <View style={[styles.routeLine, { backgroundColor: color }]} />
          <View style={[styles.routeDot, styles.routeBottom, { borderColor: color }]} />
        </View>
      );
  }
}

const styles = StyleSheet.create({
  box: { width: 20, height: 20, alignItems: "center", justifyContent: "center" },
  check: {
    width: 7,
    height: 12,
    marginTop: -3,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    transform: [{ rotate: "45deg" }],
  },
  chevron: { width: 9, height: 9, borderTopWidth: 2, borderRightWidth: 2 },
  right: { marginLeft: -4, transform: [{ rotate: "45deg" }] },
  left: { marginLeft: 4, transform: [{ rotate: "-135deg" }] },
  roof: {
    width: 11,
    height: 11,
    borderTopWidth: 1.8,
    borderLeftWidth: 1.8,
    marginBottom: -7,
    transform: [{ rotate: "45deg" }],
  },
  house: { width: 13, height: 9, borderWidth: 1.8, borderTopWidth: 0 },
  head: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.8, marginBottom: 1 },
  shoulders: {
    width: 14,
    height: 7,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderWidth: 1.8,
    borderBottomWidth: 0,
  },
  pin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderBottomRightRadius: 1,
    borderWidth: 1.8,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "45deg" }],
  },
  pinDot: { width: 4, height: 4, borderRadius: 2 },
  ring: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.8,
    alignItems: "center",
    justifyContent: "center",
  },
  ringDot: { width: 6, height: 6, borderRadius: 3 },
  // Hands of the clock glyph, inside the 16 pt ring (12.4 pt inner box, center 6.2).
  clockHand: { position: "absolute", top: 2, left: 5.3, width: 1.8, height: 5 },
  clockHandShort: { position: "absolute", top: 5.3, left: 6.2, width: 3.6, height: 1.8 },
  routeDot: { position: "absolute", width: 6, height: 6, borderRadius: 3, borderWidth: 1.8 },
  routeTop: { top: 2, right: 3 },
  routeBottom: { bottom: 2, left: 3 },
  routeLine: { width: 1.8, height: 13, transform: [{ rotate: "40deg" }] },
});
