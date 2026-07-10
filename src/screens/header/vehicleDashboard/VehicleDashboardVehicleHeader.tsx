import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Copy } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import type { Vehicle } from "../../../types/domain";
import { useTheme } from "../../../ui/ThemeProvider";

type VehicleDashboardVehicleHeaderProps = {
  vehicle: Vehicle | null;
  isPremium: boolean;
  publicReportUrl: string | null;
  onCopyVin: () => void;
  onShowQrCode: () => void;
};

export function VehicleDashboardVehicleHeader({
  vehicle,
  isPremium,
  publicReportUrl,
  onCopyVin,
  onShowQrCode,
}: VehicleDashboardVehicleHeaderProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useVehicleDashboardVehicleHeaderStyles();
  const showQr = isPremium && publicReportUrl;

  return (
    <View style={styles.root}>
      <View style={styles.text}>
        <Text
          style={[
            styles.title,
            { paddingBottom: vehicle?.vin ? 0 : theme.spacing.md },
          ]}
        >
          {vehicle ? `${vehicle.make} ${vehicle.model}` : ""}
        </Text>
        {vehicle?.vin ? (
          <Pressable onPress={onCopyVin} style={styles.vinRow} hitSlop={10}>
            <Text style={styles.vinText}>{vehicle.vin}</Text>
            <Copy size={16} color={theme.colors.muted} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>
      {showQr ? (
        <Pressable
          onPress={onShowQrCode}
          style={styles.publicPageCircleButton}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("share.showQRCode")}
        >
          <Ionicons name="qr-code-outline" size={24} color="#000" />
        </Pressable>
      ) : null}
    </View>
  );
}

function useVehicleDashboardVehicleHeaderStyles() {
  const { theme } = useTheme();
  return StyleSheet.create({
    root: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    text: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      color: theme.colors.fg,
      fontSize: theme.typography.largeTitle,
      fontWeight: theme.typography.fontWeight.bold,
    },
    vinRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
      marginTop: theme.spacing.xs,
    },
    vinText: {
      color: theme.colors.muted,
      fontSize: theme.typography.small,
      fontWeight: theme.typography.fontWeight.medium,
    },
    publicPageCircleButton: {
      width: 44,
      height: 44,
      borderRadius: 999,
      backgroundColor: theme.colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
