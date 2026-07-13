import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Copy } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import type { Vehicle } from "../../../../types/domain";
import type { OverviewPanelStyles } from "./overviewStyles";

type OverviewVehicleHeaderProps = {
  styles: OverviewPanelStyles;
  vehicle: Vehicle | null;
  theme: {
    colors: { fg: string; muted: string };
    spacing: { md: number };
  };
  isPremium: boolean;
  publicReportUrl: string | null;
  onCopyVin: () => void;
  onShowQrCode: () => void;
  showPublicQr?: boolean;
};

export function OverviewVehicleHeader({
  styles,
  vehicle,
  theme,
  isPremium,
  publicReportUrl,
  onCopyVin,
  onShowQrCode,
  showPublicQr = true,
}: OverviewVehicleHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.vehicleHeaderRow}>
      <View style={styles.vehicleHeaderText}>
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
      {showPublicQr && isPremium && publicReportUrl ? (
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
