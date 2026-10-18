import { ScrollView, View, type ScrollViewProps, type ViewProps } from "react-native";
import { SafeAreaView, type Edges } from "react-native-safe-area-context";

import { useTheme } from "../../theme";

export function Screen({
  children,
  scroll = false,
  padded = true,
  edges = ["top", "left", "right"],
  contentContainerStyle,
  ...rest
}: ViewProps & {
  scroll?: boolean;
  padded?: boolean;
  edges?: Edges;
  contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
}) {
  const theme = useTheme();
  const pad = padded ? theme.space.xl : 0;
  return (
    <SafeAreaView edges={edges} style={[{ backgroundColor: theme.colors.background, flex: 1 }, rest.style]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[{ flexGrow: 1, paddingBottom: theme.space.xxxl, paddingHorizontal: pad }, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: pad }}>{children}</View>
      )}
    </SafeAreaView>
  );
}
