import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { routes } from "../../../../../core/navigation/routes";
import { RimIcon } from "../../../../../ui/components/icons/RimIcon";
import { TireIcon } from "../../../../../ui/components/icons/TireIcon";
import { DashboardSection } from "../../components/DashboardSection";
import { DashboardStatTile } from "../../components/DashboardStatTile";
import type { OverviewPanelProps } from "../types";

export function WheelsSection({
  styles,
  theme,
  t,
  vehicleId,
  fittedTiresLines,
  fittedWheelsLines,
}: Pick<
  OverviewPanelProps,
  | "styles"
  | "theme"
  | "t"
  | "vehicleId"
  | "fittedTiresLines"
  | "fittedWheelsLines"
>) {
  const router = useRouter();

  return (
    <DashboardSection
      title={t("dashboard.stats.wheels")}
      headerRight={
        <Pressable
          onPress={() => router.push(routes.wheels(vehicleId))}
          hitSlop={8}
        >
          <Text style={[styles.viewAllLink, { color: theme.colors.accent }]}>
            {t("dashboard.stats.viewAll")}
          </Text>
        </Pressable>
      }
    >
      <DashboardStatTile
        iconComponent={<TireIcon size={24} color={theme.colors.accent} />}
        label={t("dashboard.stats.currentTire")}
        valueMain={
          <View style={styles.fittedSetsList}>
            {fittedTiresLines.map((line, idx) => (
              <Text
                key={`fitted-tire-${idx}`}
                style={[
                  styles.dashboardStatTileValueMain,
                  { color: theme.colors.fg },
                ]}
              >
                {line}
              </Text>
            ))}
          </View>
        }
        fullWidth
      />
      <DashboardStatTile
        iconComponent={<RimIcon size={24} color={theme.colors.accent} />}
        label={t("dashboard.stats.currentWheel")}
        valueMain={
          <View style={styles.fittedSetsList}>
            {fittedWheelsLines.map((line, idx) => (
              <Text
                key={`fitted-wheel-${idx}`}
                style={[
                  styles.dashboardStatTileValueMain,
                  { color: theme.colors.fg },
                ]}
              >
                {line}
              </Text>
            ))}
          </View>
        }
        fullWidth
      />
    </DashboardSection>
  );
}
