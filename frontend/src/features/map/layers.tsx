import { View } from "react-native";
import { Circle, Marker, Polyline } from "react-native-maps";

import { AppText } from "../../components/ui/AppText";
import { toLatLngs } from "../../format";
import { useTheme } from "../../theme";
import { zoneName } from "../avoidZones/service";
import type { AvoidZone } from "../avoidZones/types";
import type { LightingLayer } from "../lighting/types";
import { categoryLabel, reportAge } from "../reports/service";
import type { Report } from "../reports/types";

/** Avoid zones as circles. Render inside a MapView. */
export function AvoidZoneCircles({ zones }: { zones: AvoidZone[] }) {
  const theme = useTheme();
  return zones.map((zone) => (
    <Circle
      center={{ latitude: zone.lat, longitude: zone.lng }}
      fillColor={theme.colors.avoidZoneFill}
      key={zone.id}
      radius={zone.radius_m}
      strokeColor={theme.colors.avoidZoneStroke}
      strokeWidth={2}
    />
  ));
}

/** Recent reports as small markers with their age. Render inside a MapView. */
export function ReportMarkers({ reports }: { reports: Report[] }) {
  const theme = useTheme();
  return reports.map((report) => (
    <Marker
      accessibilityLabel={`${categoryLabel(report.category)}, reported ${reportAge(report.created_at)}`}
      anchor={{ x: 0.5, y: 0.5 }}
      coordinate={{ latitude: report.lat, longitude: report.lng }}
      description={[reportAge(report.created_at), report.note].filter(Boolean).join(" · ")}
      key={report.id}
      title={categoryLabel(report.category)}
      tracksViewChanges={false}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: theme.colors.report,
          borderColor: theme.colors.surface,
          borderRadius: theme.radius.full,
          borderWidth: 2,
          height: theme.size.icon.lg,
          justifyContent: "center",
          width: theme.size.icon.lg,
        }}
      >
        <AppText color={theme.colors.surface} variant="caption">
          !
        </AppText>
      </View>
    </Marker>
  ));
}

/** Street segments colored lit, unlit (no light recorded), or unknown (dashed). */
export function LightingLines({ layer }: { layer: LightingLayer }) {
  const theme = useTheme();
  return layer.features.map((feature, index) => {
    const { lit } = feature.properties;
    const color = lit === true ? theme.colors.lightingLit : lit === false ? theme.colors.lightingUnlit : theme.colors.lightingUnknown;
    return (
      <Polyline
        coordinates={toLatLngs(feature.geometry)}
        key={`lighting-${index}`}
        lineCap="round"
        lineDashPattern={lit === null ? [4, 6] : undefined}
        strokeColor={color}
        strokeWidth={lit === true ? 4 : 3}
        zIndex={0}
      />
    );
  });
}

/** Legend for the lighting layer, with cautious wording. */
export function LightingLegend() {
  const theme = useTheme();
  const rows = [
    { color: theme.colors.lightingLit, label: "Streetlight recorded", dashed: false },
    { color: theme.colors.lightingUnlit, label: "No streetlight recorded", dashed: false },
    { color: theme.colors.lightingUnknown, label: "No lighting data", dashed: true },
  ];
  return (
    <View style={{ gap: theme.space.xs }}>
      {rows.map((row) => (
        <View key={row.label} style={{ alignItems: "center", flexDirection: "row", gap: theme.space.sm }}>
          <View
            style={{
              borderColor: row.color,
              borderStyle: row.dashed ? "dashed" : "solid",
              borderTopWidth: 3,
              width: theme.size.icon.lg,
            }}
          />
          <AppText variant="caption">{row.label}</AppText>
        </View>
      ))}
    </View>
  );
}

export function zoneLabel(zone: AvoidZone): string {
  return `${zoneName(zone)} · ${zone.radius_m} m`;
}
