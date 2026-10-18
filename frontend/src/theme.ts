// theme.ts — UW Husky design tokens for React Native / Expo
// Usage:  const theme = useTheme();  style={{ backgroundColor: theme.colors.surface, padding: theme.space.lg }}
// Rule: screens never hardcode hex codes or pixel numbers — always pull from here.

import { Platform, useColorScheme, type TextStyle, type ViewStyle } from "react-native";

// ---------- Official UW brand colors (raw ingredients) ----------
export const uw = {
  huskyPurple: "#32006E",
  spiritPurple: "#4B2E83",
  huskyGold: "#B7A57A",
  huskyGoldTint: "#E8E3D3",
  heritageGold: "#85754D",
  spiritGold: "#FFC700",
  lavender: "#C5B4E3",
  teal: "#2AD2C9",
} as const;

// ---------- App color tokens ----------
type Colors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  primarySoft: string;
  gold: string;
  goldText: string;
  highlight: string;
  success: string;
  warning: string;
  error: string;
  routeWalked: string;
  routePlanned: string;
  routeCasing: string;
  routeFastest: string;
  routeSafer: string;
  locationHalo: string;
};

const light: Colors = {
  background: "#FAF8F5",
  surface: "#FFFFFF",
  surfaceAlt: "#F3EFE6",
  border: "#E6E1D6",
  textPrimary: "#1C1626",
  textSecondary: "#5E5869",
  textTertiary: "#8E8899",
  primary: uw.spiritPurple,
  primaryPressed: uw.huskyPurple,
  onPrimary: "#FFFFFF",
  primarySoft: "#EDE7F6",
  gold: uw.huskyGold,
  goldText: uw.heritageGold,
  highlight: uw.spiritGold,
  success: "#1F8A5B",
  warning: "#B26B00",
  error: "#C62828",
  routeWalked: uw.spiritPurple,
  routePlanned: uw.lavender,
  routeCasing: "#FFFFFF",
  routeFastest: "#6d28d9",
  routeSafer: "#5b21b6",
  locationHalo: "rgba(75, 46, 131, 0.2)",
};

const dark: Colors = {
  background: "#120D1A",
  surface: "#1C1527",
  surfaceAlt: "#261D33",
  border: "#352A45",
  textPrimary: "#F5F2FA",
  textSecondary: "#B9B0C9",
  textTertiary: "#857C96",
  primary: uw.lavender,
  primaryPressed: "#B09BD6",
  onPrimary: uw.huskyPurple,
  primarySoft: "#2E2340",
  gold: "#E8D3A2",
  goldText: "#E8D3A2",
  highlight: uw.spiritGold,
  success: "#4CC38A",
  warning: "#F2B54A",
  error: "#FF6B6B",
  routeWalked: uw.lavender,
  routePlanned: "#6E5A92",
  routeCasing: "#120D1A",
  routeFastest: "#6d28d9",
  routeSafer: "#5b21b6",
  locationHalo: "rgba(197, 180, 227, 0.25)",
};

// ---------- Spacing (4-point grid) ----------
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

// ---------- Corner radius ----------
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

// ---------- Sizes ----------
export const size = {
  touchMin: 44,
  buttonLg: 52,
  buttonMd: 44,
  buttonSm: 36,
  input: 52,
  chip: 32,
  iconButton: 44,
  fab: 56,
  tabBar: 56,
  icon: { sm: 16, md: 20, lg: 24, xl: 28 },
  avatar: { sm: 32, md: 40, lg: 72 },
} as const;

// ---------- Typography ----------
export const fonts = {
  headingBold: "EncodeSans_700Bold",
  headingSemi: "EncodeSans_600SemiBold",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemi: "Inter_600SemiBold",
} as const;

export const type = {
  display: { fontFamily: fonts.headingBold, fontSize: 32, lineHeight: 38 },
  title1: { fontFamily: fonts.headingSemi, fontSize: 24, lineHeight: 30 },
  title2: { fontFamily: fonts.headingSemi, fontSize: 20, lineHeight: 26 },
  headline: { fontFamily: fonts.bodySemi, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  callout: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 20 },
  subhead: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 16 },
  overline: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  stat: {
    fontFamily: fonts.headingBold,
    fontSize: 40,
    lineHeight: 44,
    fontVariant: ["tabular-nums"],
  },
} satisfies Record<string, TextStyle>;

// ---------- Shadows (purple-tinted; skipped in dark mode) ----------
const makeShadow = (opacity: number, radiusPx: number, y: number, elevation: number): ViewStyle =>
  Platform.select({
    android: { elevation },
    default: {
      shadowColor: uw.huskyPurple,
      shadowOpacity: opacity,
      shadowRadius: radiusPx,
      shadowOffset: { width: 0, height: y },
    },
  }) as ViewStyle;

const lightShadows = {
  none: {} as ViewStyle,
  sm: makeShadow(0.06, 4, 1, 1),
  md: makeShadow(0.1, 12, 4, 4),
  lg: makeShadow(0.16, 24, 8, 8),
};

const darkShadows: typeof lightShadows = { none: {}, sm: {}, md: {}, lg: {} };

// ---------- Motion ----------
export const motion = {
  fast: 150,
  normal: 220,
  slow: 300,
  pressScale: 0.98,
} as const;

// ---------- Assembled themes ----------
export const lightTheme = {
  colors: light,
  space,
  radius,
  size,
  type,
  fonts,
  shadow: lightShadows,
  motion,
  isDark: false,
};
export const darkTheme = {
  colors: dark,
  space,
  radius,
  size,
  type,
  fonts,
  shadow: darkShadows,
  motion,
  isDark: true,
};
export type Theme = typeof lightTheme;

export function useTheme(): Theme {
  return useColorScheme() === "dark" ? darkTheme : lightTheme;
}

/** Route line widths from the Husky map guide. */
export const mapStroke = {
  casing: 9,
  walked: 6,
  planned: 5,
  dash: [8, 8] as number[],
};

/** A quiet Google map. iOS ignores this. */
export const mutedMapStyle = [
  { elementType: "geometry", stylers: [{ saturation: -35 }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];
