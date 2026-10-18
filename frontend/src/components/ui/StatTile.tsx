import { View } from "react-native";

import { useTheme } from "../../theme";
import { AppText } from "./AppText";

export function StatTile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, gap: theme.space.xs }}>
      <AppText variant="overline">{label}</AppText>
      <AppText variant="stat">{value}</AppText>
      {unit ? <AppText variant="subhead">{unit}</AppText> : null}
    </View>
  );
}
