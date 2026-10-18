import { Switch, View } from "react-native";

import { AppText } from "../components/ui/AppText";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { setMocksShouldFail, useMocksShouldFail } from "../config/devSettings";
import { isEnabled } from "../config/features";
import { useTheme } from "../theme";

/** Feature links and settings shown on the Profile tab, above "Log out". */
export function ProfileExtras({ onSavedPlaces }: { onSavedPlaces: () => void }) {
  const theme = useTheme();
  const failMocks = useMocksShouldFail();
  return (
    <View style={{ gap: theme.space.lg }}>
      {isEnabled("savedPlaces") ? <Button label="Saved places" onPress={onSavedPlaces} variant="secondary" /> : null}
      {__DEV__ ? (
        <Card style={{ alignItems: "center", flexDirection: "row", gap: theme.space.md }}>
          <View style={{ flex: 1, gap: theme.space.xxs }}>
            <AppText variant="headline">Make sample data fail</AppText>
            <AppText variant="caption">Developer only. Tests error states. Resets when the app reloads.</AppText>
          </View>
          <Switch
            accessibilityLabel="Make sample data fail"
            onValueChange={setMocksShouldFail}
            thumbColor={theme.colors.surface}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            value={failMocks}
          />
        </Card>
      ) : null}
    </View>
  );
}
