import { useState } from "react";
import { View } from "react-native";
import MapView from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "../../components/ScreenHeader";
import { AppText } from "../../components/ui/AppText";
import { Button } from "../../components/ui/Button";
import { mutedMapStyle, useTheme, uw } from "../../theme";
import { UW_CENTER } from "../shared/mock";

export type PickedPoint = { lat: number; lng: number };

/** Move the map until the pin sits on the spot, then confirm. */
export function MapPickerScreen({
  title,
  initial,
  onPick,
  onBack,
}: {
  title: string;
  initial?: PickedPoint | null;
  onPick: (point: PickedPoint) => void;
  onBack: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const start = initial ?? UW_CENTER;
  const [center, setCenter] = useState<PickedPoint>(start);

  return (
    <View style={{ backgroundColor: theme.colors.background, flex: 1 }}>
      <View style={{ paddingHorizontal: theme.space.xl, paddingTop: insets.top + theme.space.sm }}>
        <ScreenHeader eyebrow="Pick on map" onBack={onBack} title={title} />
      </View>
      <View style={{ flex: 1, marginTop: theme.space.md }}>
        <MapView
          customMapStyle={mutedMapStyle}
          initialRegion={{ latitude: start.lat, longitude: start.lng, latitudeDelta: 0.008, longitudeDelta: 0.008 }}
          onRegionChangeComplete={(region) => setCenter({ lat: region.latitude, lng: region.longitude })}
          showsPointsOfInterests={false}
          style={{ flex: 1 }}
          userInterfaceStyle={theme.isDark ? "dark" : "light"}
        />
        <View
          pointerEvents="none"
          style={{ alignItems: "center", bottom: 0, justifyContent: "center", left: 0, position: "absolute", right: 0, top: 0 }}
        >
          <View
            accessibilityLabel="Pin at the center of the map"
            style={{
              backgroundColor: theme.colors.highlight,
              borderColor: uw.huskyPurple,
              borderRadius: theme.radius.full,
              borderWidth: 3,
              height: theme.size.icon.xl,
              width: theme.size.icon.xl,
            }}
          />
        </View>
      </View>
      <View style={{ gap: theme.space.sm, padding: theme.space.xl, paddingBottom: insets.bottom + theme.space.lg }}>
        <AppText variant="caption">
          {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
        </AppText>
        <Button haptic="medium" label="Use this spot" onPress={() => onPick(center)} />
      </View>
    </View>
  );
}
