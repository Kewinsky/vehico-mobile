import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import type { Vehicle } from "../../../../types/domain";
import type { OverviewPanelStyles } from "./overviewStyles";

type OverviewVehicleHeaderProps = {
  styles: OverviewPanelStyles;
  vehicle: Vehicle | null;
  isPremium: boolean;
  publicReportUrl: string | null;
  onShowQrCode: () => void;
  showPublicQr?: boolean;
};

export function OverviewVehicleHeader({
  styles,
  vehicle,
  isPremium,
  publicReportUrl,
  onShowQrCode,
  showPublicQr = true,
}: OverviewVehicleHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.vehicleHeaderRow}>
      <View style={styles.vehicleHeaderText}>
        <Text style={styles.title}>
          {vehicle ? `${vehicle.make} ${vehicle.model}` : ""}
        </Text>
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
