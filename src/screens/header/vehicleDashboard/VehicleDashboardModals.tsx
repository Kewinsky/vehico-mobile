import { useEffect } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import * as Font from "expo-font";
import {
  FontAwesome5,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { FormGlassSurface } from "../../../ui/components/common/FormGlassSurface";
import { FormShareLink } from "../../../ui/components/common/FormShareLink";
import { Button } from "../../../ui/components/common/Button";
import { BrandedQrCode } from "../../../ui/components/branding/BrandedQrCode";
import { useTheme } from "../../../ui/ThemeProvider";
import { localeCodeFromLanguage } from "../../../utils/numberFormatting";
import { formatYmd, parseYmd } from "../../../utils/dateYmd";
import { useVehicleDashboard } from "./VehicleDashboardContext";
import { makeDashboardScreenStyles } from "./dashboardScreenStyles";

export function VehicleDashboardModals() {
  const { t, i18n } = useTranslation();
  const { theme, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeDashboardScreenStyles(theme, insets);
  const { width: windowWidth, height: windowHeight } = Dimensions.get("window");
  const {
    vehicle,
    photoUrls,
    publicReportUrl,
    fullScreenIndex,
    setFullScreenIndex,
    isPublicQrVisible,
    setIsPublicQrVisible,
    formalityOverlay,
    setFormalityOverlay,
    handleOpenPublicReportInBrowser,
    saveFormalitiesDate,
  } = useVehicleDashboard();

  useEffect(() => {
    const loadIconFonts = async () => {
      await Font.loadAsync({
        ...Ionicons.font,
        ...MaterialCommunityIcons.font,
        ...FontAwesome5.font,
        ...MaterialIcons.font,
      });
    };
    void loadIconFonts();
  }, []);

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
                  style={[styles.qrModalSubtitle, { color: theme.colors.fg }]}
                >
                  {t("share.qrCodeSubtitle")}
                </Text>
                <View style={styles.qrWrap}>
                  <BrandedQrCode value={publicReportUrl} size={220} />
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
                    onPress={() => void handleOpenPublicReportInBrowser()}
                    style={{ backgroundColor: theme.colors.bg }}
                  >
                    <Ionicons
                      name="globe-outline"
                      size={18}
                      color={theme.colors.fg}
                    />
                    <Text
                      style={[
                        styles.qrShareButtonText,
                        { color: theme.colors.fg },
                      ]}
                    >
                      {t("share.openInBrowser")}
                    </Text>
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

      {formalityOverlay && Platform.OS === "android" ? (
        // Android date dialog has its own OK/Cancel buttons; no custom card needed.
        <DateTimePicker
          key={formalityOverlay.field}
          value={parseYmd(
            formalityOverlay.value.length === 10
              ? formalityOverlay.value
              : formatYmd(new Date()),
          )}
          mode="date"
          display="default"
          locale={localeCodeFromLanguage(i18n.language)}
          onChange={(event, selectedDate) => {
            setFormalityOverlay(null);
            if (event.type === "dismissed" || !selectedDate) return;
            void saveFormalitiesDate(
              formalityOverlay.field,
              formatYmd(selectedDate),
            );
          }}
        />
      ) : null}

      {formalityOverlay && Platform.OS !== "android" ? (
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
              <FormGlassSurface
                shape="rounded"
                cornerRadius={theme.radius.xl}
              />
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
