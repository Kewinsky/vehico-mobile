import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Image } from "expo-image";
import QRCode from "react-native-qrcode-svg";

import { FormGlassSurface } from "../../../ui/components/common/FormGlassSurface";
import { Button } from "../../../ui/components/common/Button";
import { FormShareLink } from "../../../ui/components/common/FormShareLink";
import { Logo } from "../../../ui/components/branding/Logo";
import { formatYmd, parseYmd } from "../../../utils/dateYmd";
import { localeCodeFromLanguage } from "../../../utils/numberFormatting";
import { useVehicleDashboard } from "./VehicleDashboardProvider";

/** Shared modals for all vehicle dashboard tabs (QR, fullscreen photos, date picker). */
export function VehicleDashboardModals() {
  const { t, i18n } = useTranslation();
  const {
    vehicle,
    photoUrls,
    publicReportUrl,
    windowWidth,
    windowHeight,
    theme,
    mode,
    insets,
    fullScreenIndex,
    setFullScreenIndex,
    isPublicQrVisible,
    setIsPublicQrVisible,
    formalityOverlay,
    setFormalityOverlay,
    handleCopyPublicReportLink,
    handleOpenPublicReportInBrowser,
    saveFormalitiesDate,
  } = useVehicleDashboard();

  const styles = makeStyles(theme, mode);

  return (
    <>
      <Modal
        visible={isPublicQrVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPublicQrVisible(false)}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalCard}>
            <FormGlassSurface shape="rounded" cornerRadius={theme.radius.xl} />
            <Pressable
              style={styles.qrModalClose}
              onPress={() => setIsPublicQrVisible(false)}
              hitSlop={10}
            >
              <Ionicons name="close" size={22} color={theme.colors.fg} />
            </Pressable>
            {publicReportUrl ? (
              <>
                <Text
                  style={[styles.qrModalSubtitle, { color: theme.colors.muted }]}
                >
                  {t("share.qrCodeSubtitle")}
                </Text>
                <View style={styles.qrWrap}>
                  <QRCode
                    value={publicReportUrl}
                    size={220}
                    color={mode === "dark" ? "#ffffff" : "#000000"}
                    backgroundColor={theme.colors.bg}
                    ecl="H"
                  />
                  <View style={styles.qrLogoOverlay} pointerEvents="none">
                    <View style={styles.qrLogoBadge}>
                      <Logo width={34} height={34} />
                    </View>
                  </View>
                </View>
                <View style={styles.qrModalActions}>
                  <FormShareLink
                    item={publicReportUrl}
                    subject={
                      vehicle
                        ? `${vehicle.make} ${vehicle.model}`.trim()
                        : undefined
                    }
                    message={t("share.reportShareMessage", {
                      vehicleTitle: vehicle
                        ? `${vehicle.make} ${vehicle.model}`.trim()
                        : "",
                    })}
                  >
                    <View style={styles.qrShareButton}>
                      <Ionicons
                        name="share-outline"
                        size={18}
                        color={theme.colors.fg}
                      />
                      <Text
                        style={[
                          styles.qrShareButtonText,
                          { color: theme.colors.fg },
                        ]}
                      >
                        {t("share.shareLink")}
                      </Text>
                    </View>
                  </FormShareLink>
                  <Button
                    variant="ghost"
                    onPress={() => void handleCopyPublicReportLink()}
                  >
                    {t("share.copyLink")}
                  </Button>
                  <Button
                    variant="ghost"
                    onPress={() => void handleOpenPublicReportInBrowser()}
                  >
                    {t("share.openInBrowser")}
                  </Button>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={fullScreenIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setFullScreenIndex(null)}
      >
        <View
          style={[
            styles.fullScreenOverlay,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}
        >
          <Pressable
            style={[styles.fullScreenClose, { top: insets.top + 8 }]}
            onPress={() => setFullScreenIndex(null)}
            hitSlop={12}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </Pressable>
          {fullScreenIndex !== null && photoUrls.length > 0 ? (
            <FlatList
              data={photoUrls}
              horizontal
              pagingEnabled
              initialScrollIndex={fullScreenIndex}
              getItemLayout={(_, index) => ({
                length: windowWidth,
                offset: windowWidth * index,
                index,
              })}
              keyExtractor={(url) => url}
              renderItem={({ item: url }) => (
                <View
                  style={{
                    width: windowWidth,
                    height: windowHeight - insets.top - insets.bottom,
                    justifyContent: "center",
                  }}
                >
                  <Image
                    source={{ uri: url }}
                    style={{
                      width: windowWidth,
                      height: windowHeight - insets.top - insets.bottom,
                    }}
                    contentFit="contain"
                  />
                </View>
              )}
              showsHorizontalScrollIndicator={false}
            />
          ) : null}
        </View>
      </Modal>

      {formalityOverlay && Platform.OS === "ios" ? (
        <Modal
          key={formalityOverlay.field}
          transparent
          visible
          animationType="fade"
          onRequestClose={() => setFormalityOverlay(null)}
        >
          <Pressable
            style={styles.datePickerOverlay}
            onPress={() => setFormalityOverlay(null)}
          >
            <Pressable
              style={styles.datePickerCard}
              onPress={(event) => event.stopPropagation()}
            >
              <FormGlassSurface shape="rounded" cornerRadius={theme.radius.xl} />
              <View style={styles.datePickerContent}>
                <DateTimePicker
                  style={styles.datePickerNative}
                  value={parseYmd(
                    formalityOverlay.value.length === 10
                      ? formalityOverlay.value
                      : formatYmd(new Date()),
                  )}
                  mode="date"
                  display="inline"
                  locale={localeCodeFromLanguage(i18n.language)}
                  accentColor={theme.colors.accent}
                  themeVariant={mode === "dark" ? "dark" : "light"}
                  onChange={(_, selectedDate) => {
                    if (!selectedDate) return;
                    setFormalityOverlay((prev) =>
                      prev ? { ...prev, value: formatYmd(selectedDate) } : prev,
                    );
                  }}
                />
                <View style={styles.datePickerActions}>
                  <Pressable
                    onPress={() => setFormalityOverlay(null)}
                    hitSlop={8}
                  >
                    <Text
                      style={[
                        styles.datePickerActionText,
                        { color: theme.colors.muted },
                      ]}
                    >
                      {t("common.cancel")}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      void saveFormalitiesDate(
                        formalityOverlay.field,
                        formalityOverlay.value.length === 10
                          ? formalityOverlay.value
                          : formatYmd(new Date()),
                      );
                      setFormalityOverlay(null);
                    }}
                    hitSlop={8}
                  >
                    <Text
                      style={[
                        styles.datePickerActionText,
                        { color: theme.colors.accent },
                      ]}
                    >
                      {t("common.save")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </>
  );
}

const makeStyles = (
  theme: ReturnType<typeof useVehicleDashboard>["theme"],
  mode: ReturnType<typeof useVehicleDashboard>["mode"],
) =>
  StyleSheet.create({
    fullScreenOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.95)",
      justifyContent: "center",
    },
    fullScreenClose: {
      position: "absolute",
      right: theme.spacing.md,
      zIndex: 10,
      width: theme.spacing.xl + theme.spacing.lg,
      height: theme.spacing.xl + theme.spacing.lg,
      borderRadius: (theme.spacing.xl + theme.spacing.lg) / 2,
      backgroundColor: "rgba(0,0,0,0.4)",
      alignItems: "center",
      justifyContent: "center",
    },
    datePickerOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },
    datePickerCard: {
      width: "100%",
      maxWidth: 360,
      alignSelf: "center",
      borderRadius: theme.radius.xl,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: "transparent",
      overflow: "hidden",
    },
    datePickerContent: {
      width: "100%",
      alignItems: "center",
    },
    datePickerNative: {
      alignSelf: "center",
    },
    datePickerActions: {
      width: "100%",
      flexDirection: "row",
      justifyContent: "flex-end",
      paddingTop: theme.spacing.xs,
      gap: theme.spacing.xl,
    },
    datePickerActionText: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    qrModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
    },
    qrModalCard: {
      width: "100%",
      maxWidth: 320,
      borderRadius: theme.radius.xl,
      padding: theme.spacing.md,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    qrModalClose: {
      position: "absolute",
      top: theme.spacing.sm,
      right: theme.spacing.sm,
      zIndex: 10,
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
    },
    qrModalSubtitle: {
      marginTop: theme.spacing.xl,
      paddingHorizontal: theme.spacing.sm,
      fontSize: theme.typography.small,
      lineHeight: theme.typography.body + 2,
      textAlign: "center",
    },
    qrModalActions: {
      width: "100%",
      gap: theme.spacing.xs,
    },
    qrShareButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.card,
    },
    qrShareButtonText: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    qrWrap: {
      position: "relative",
      width: 220,
      height: 220,
      alignItems: "center",
      justifyContent: "center",
      margin: theme.spacing.xl,
    },
    qrLogoOverlay: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
    },
    qrLogoBadge: {
      backgroundColor: mode === "dark" ? "#FFFFFF" : "#000000",
      borderRadius: 999,
      padding: theme.spacing.xs,
      alignItems: "center",
      justifyContent: "center",
    },
  });
