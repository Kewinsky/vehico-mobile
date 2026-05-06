import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Modal,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import Purchases from "react-native-purchases";
import RevenueCatUI from "react-native-purchases-ui";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { Card } from "../../ui/components/common/Card";
import { Button } from "../../ui/components/common/Button";
import { LegalLinksRow } from "../../ui/components/common/LegalLinksRow";
import { ModalLayout } from "../../layouts";
import { hexToRgba } from "../../ui/components/common/ChoiceChip";
import type { AppTheme } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import type { RevenueCatProductId } from "../../services/payments/revenuecat";
import { ENV } from "../../config/env";
import { toastError, toastSuccess } from "../../ui/toast/toast";
import { BRAND_FONT_FAMILY } from "../../ui/components/branding/BrandHero";
import { DecorativeBackground } from "../../ui/components/branding/DecorativeBackground";
import { Logo } from "../../ui/components/branding/Logo";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = NativeStackScreenProps<AppStackParamList, "Shop">;
const DEFAULT_SUBSCRIPTION: RevenueCatProductId = "yearly";
type HeroIconName = React.ComponentProps<typeof Ionicons>["name"];

const HERO_ICONS: HeroIconName[] = [
  "sparkles-outline",
  "car-sport-outline",
  "document-text-outline",
  "notifications-outline",
];

const HERO_ICON_POSITIONS = [
  { top: 10, left: 10, rotation: "-8deg" },
  { top: 14, right: 8, rotation: "10deg" },
  { bottom: 16, left: 22, rotation: "8deg" },
  { bottom: 10, right: 14, rotation: "-9deg" },
] as const;
/** Pixels before the end of the scroll where the pricing sheet animates in */
const FOOTER_REVEAL_DISTANCE = 100;
/** Fallback hide distance before we measure the real sheet height */
const FOOTER_HIDE_FALLBACK = 360;
/** Space under scroll content so the last rows clear the sheet when it is shown */
const FOOTER_SCROLL_CLEARANCE = 228;

export function ShopScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    refresh,
    isPremium,
    currentPlanProductId,
    revenueCatProducts,
    purchaseRevenueCatProduct,
    restoreRevenueCatPurchases,
  } = useEntitlements();
  const [purchasing, setPurchasing] = useState<RevenueCatProductId | null>(
    null,
  );
  const [actionLoading, setActionLoading] = useState<"restore" | null>(null);
  const [customerCenterVisible, setCustomerCenterVisible] = useState(false);
  const [selectedSubscription, setSelectedSubscription] =
    useState<RevenueCatProductId>(DEFAULT_SUBSCRIPTION);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [scrollContentHeight, setScrollContentHeight] = useState(0);
  const [footerSheetHeight, setFooterSheetHeight] = useState(0);
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const maxScrollY = Math.max(scrollContentHeight - scrollViewHeight, 0);
  const footerHideOffset =
    Math.max(footerSheetHeight, FOOTER_HIDE_FALLBACK) + 24;

  const footerTranslateY = useMemo(() => {
    if (maxScrollY <= 0) {
      return scrollY.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0],
        extrapolate: "clamp",
      });
    }
    const revealStart = Math.max(maxScrollY - FOOTER_REVEAL_DISTANCE, 0);
    if (revealStart <= 0) {
      return scrollY.interpolate({
        inputRange: [0, maxScrollY],
        outputRange: [footerHideOffset, 0],
        extrapolate: "clamp",
      });
    }
    return scrollY.interpolate({
      inputRange: [0, revealStart, maxScrollY],
      outputRange: [footerHideOffset, footerHideOffset, 0],
      extrapolate: "clamp",
    });
  }, [footerHideOffset, maxScrollY, scrollY]);

  const footerOpacity = useMemo(() => {
    if (maxScrollY <= 0) {
      return scrollY.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1],
        extrapolate: "clamp",
      });
    }
    const revealStart = Math.max(maxScrollY - FOOTER_REVEAL_DISTANCE, 0);
    if (revealStart <= 0) {
      return scrollY.interpolate({
        inputRange: [0, maxScrollY],
        outputRange: [0, 1],
        extrapolate: "clamp",
      });
    }
    return scrollY.interpolate({
      inputRange: [0, revealStart, maxScrollY],
      outputRange: [0, 0, 1],
      extrapolate: "clamp",
    });
  }, [maxScrollY, scrollY]);

  const scrollHintOpacity = useMemo(() => {
    if (maxScrollY <= 0) {
      return scrollY.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0],
        extrapolate: "clamp",
      });
    }
    const revealStart = Math.max(maxScrollY - FOOTER_REVEAL_DISTANCE, 0);
    if (revealStart <= 0) {
      return scrollY.interpolate({
        inputRange: [0, maxScrollY * 0.5],
        outputRange: [1, 0],
        extrapolate: "clamp",
      });
    }
    const pFade = Math.max(revealStart - 52, revealStart * 0.15);
    const p1 = Math.min(pFade, revealStart - 0.01);
    return scrollY.interpolate({
      inputRange: [0, p1, revealStart],
      outputRange: [1, 0.42, 0],
      extrapolate: "clamp",
    });
  }, [maxScrollY, scrollY]);

  const chevronBounce = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(chevronBounce, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(chevronBounce, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [chevronBounce]);
  const chevronTranslateY = chevronBounce.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 7],
    extrapolate: "clamp",
  });

  function handleScrollLayout(event: LayoutChangeEvent) {
    setScrollViewHeight(event.nativeEvent.layout.height);
  }

  function handleFooterSheetLayout(event: LayoutChangeEvent) {
    const next = Math.round(event.nativeEvent.layout.height);
    setFooterSheetHeight((prev) => (prev === next ? prev : next));
  }

  const selectedId = isPremium
    ? (currentPlanProductId ?? DEFAULT_SUBSCRIPTION)
    : selectedSubscription;

  async function handlePurchase(productId: RevenueCatProductId) {
    if (purchasing) return;
    try {
      setPurchasing(productId);
      await purchaseRevenueCatProduct(productId);
      await refresh();
      toastSuccess(t("shop.purchaseSuccess"));
    } catch (e: any) {
      if (
        e?.userCancelled ||
        e?.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
      ) {
        return;
      }
      toastError(e?.message ?? t("common.error"));
    } finally {
      setPurchasing(null);
    }
  }

  function handleOpenCustomerCenter() {
    if (actionLoading || purchasing) return;
    setCustomerCenterVisible(true);
  }

  function handleCustomerCenterDismiss() {
    setCustomerCenterVisible(false);
    void refresh();
  }

  async function handleRestorePurchases() {
    if (actionLoading || purchasing) return;
    try {
      setActionLoading("restore");
      await restoreRevenueCatPurchases();
      await refresh();
      toastSuccess(t("shop.purchaseSuccess"));
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setActionLoading(null);
    }
  }

  function startPurchase(productId: RevenueCatProductId) {
    if (purchasing) return;
    if (isPremium) {
      Alert.alert(t("shop.premiumIsActive"), t("shop.premiumIsActiveBody"), [
        { text: "OK" },
      ]);
      return;
    }
    void handlePurchase(productId);
  }

  const accentBg = useMemo(
    () => hexToRgba(theme.colors.accent, 0.15),
    [theme.colors.accent],
  );

  function getProductPrice(productId: RevenueCatProductId): string {
    return revenueCatProducts[productId]?.priceString ?? "—";
  }

  const exampleReportUrl = `${ENV.REPORTS_APP_URL}/report/example`;
  const premiumFeatures = [
    {
      icon: "car-sport-outline" as const,
      text: t("shop.premiumFeatures.unlimitedVehicles"),
    },
    {
      icon: "document-text-outline" as const,
      text: t("shop.premiumFeatures.onlineReports"),
      link: {
        label: t("shop.premiumFeatures.onlineReportsLink"),
        url: exampleReportUrl,
      },
    },
    {
      icon: "megaphone-outline" as const,
      text: t("shop.premiumFeatures.marketplaceListings"),
      link: {
        label: t("shop.premiumFeatures.marketplaceListingsLink"),
        onPress: () => navigation.navigate("ExampleListing"),
      },
    },
    {
      icon: "notifications-outline" as const,
      text: t("shop.premiumFeatures.remindersWorkshops"),
    },
  ];

  function FeatureRow({
    icon,
    text,
    link,
  }: {
    icon: HeroIconName;
    text: string;
    link?: {
      label: string;
      url?: string;
      onPress?: () => void;
    };
  }) {
    async function handleLinkPress() {
      if (!link) return;
      if (link.onPress) {
        link.onPress();
        return;
      }
      if (link.url) {
        try {
          await WebBrowser.openBrowserAsync(link.url);
        } catch {
          toastError(t("common.error"));
        }
      }
    }
    return (
      <View style={styles.featureCard}>
        <View
          style={[
            styles.featureIconWrap,
            { backgroundColor: hexToRgba(theme.colors.accent, 0.14) },
          ]}
        >
          <Ionicons name={icon} size={26} color={theme.colors.accent} />
        </View>
        <View style={styles.featureTextWrap}>
          <Text style={[styles.featureText, { color: theme.colors.fg }]}>
            {text}
          </Text>
          {link ? (
            <Pressable
              onPress={() => void handleLinkPress()}
              hitSlop={8}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Text
                style={[styles.featureLink, { color: theme.colors.accent }]}
              >
                {link.label}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  function PriceCard({
    productId,
    unitLabel,
    primaryValue,
  }: {
    productId: RevenueCatProductId;
    unitLabel: string;
    primaryValue: string;
  }) {
    const selected = selectedId === productId;
    const disabled = isPremium || purchasing !== null || actionLoading !== null;
    const grayedOut = isPremium && !selected;
    const price = getProductPrice(productId);

    return (
      <Pressable
        key={productId}
        disabled={disabled}
        onPress={() => {
          if (!isPremium) setSelectedSubscription(productId);
        }}
        style={({ pressed }) => [
          styles.tierPressable,
          { opacity: grayedOut ? 0.6 : pressed && !disabled ? 0.9 : 1 },
        ]}
      >
        <Card
          style={[
            styles.tierCard,
            {
              backgroundColor: selected ? accentBg : theme.colors.card,
              borderColor: selected ? theme.colors.accent : theme.colors.border,
            },
          ]}
        >
          <View style={styles.tierTopRow}>
            <Text
              style={[
                styles.tierValue,
                { color: grayedOut ? theme.colors.muted : theme.colors.fg },
              ]}
            >
              {primaryValue}
            </Text>
          </View>
          <Text
            style={[
              styles.tierUnit,
              { color: grayedOut ? theme.colors.muted : theme.colors.muted },
            ]}
          >
            {unitLabel}
          </Text>
          <View style={styles.tierPriceRow}>
            {purchasing === productId ? (
              <ActivityIndicator size="small" color={theme.colors.accent} />
            ) : (
              <Text
                style={[
                  styles.tierPrice,
                  { color: grayedOut ? theme.colors.muted : theme.colors.fg },
                ]}
              >
                {price}
              </Text>
            )}
          </View>
        </Card>
      </Pressable>
    );
  }

  const canPurchase =
    purchasing === null && actionLoading === null && !isPremium;

  const subs: Record<"left" | "middle" | "right", RevenueCatProductId> = {
    left: "monthly" as const,
    middle: "yearly" as const,
    right: "lifetime" as const,
  };

  return (
    <ModalLayout
      title={t("shop.title")}
      cancel={{ onPress: () => navigation.goBack(), label: t("common.cancel") }}
      background={<DecorativeBackground variant="landing" />}
      useHorizontalContentInset={false}
    >
      <View style={{ flex: 1 }}>
        <NativeHeaderScrollView
          onLayout={handleScrollLayout}
          onContentSizeChange={(_, height) => setScrollContentHeight(height)}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingBottom:
              theme.spacing.sm + FOOTER_SCROLL_CLEARANCE + insets.bottom,
          }}
        >
          <View style={styles.container}>
            <View style={styles.heroSection}>
              <PremiumHero theme={theme} />
              <View style={styles.heroCopy}>
                <Text style={[styles.heroTitle, { color: theme.colors.fg }]}>
                  {t("shop.unlockPremium")}
                </Text>
                <Text
                  style={[styles.heroSubtitle, { color: theme.colors.muted }]}
                  numberOfLines={2}
                >
                  {t("shop.heroSubtitle")}
                </Text>
              </View>
            </View>

            <View style={styles.featuresGrid}>
              {premiumFeatures.map((feature) => (
                <FeatureRow
                  key={feature.text}
                  icon={feature.icon}
                  text={feature.text}
                  link={feature.link}
                />
              ))}
            </View>
          </View>
        </NativeHeaderScrollView>

        <Animated.View
          pointerEvents="none"
          accessibilityRole="none"
          accessibilityLabel={t("shop.scrollForPricingHint")}
          style={[
            styles.scrollDownHint,
            {
              bottom: insets.bottom - 10,
              opacity: scrollHintOpacity,
            },
          ]}
        >
          <Animated.View
            style={{ transform: [{ translateY: chevronTranslateY }] }}
          >
            <Ionicons
              name="chevron-down"
              size={30}
              color={hexToRgba(theme.colors.accent, 0.85)}
            />
          </Animated.View>
        </Animated.View>

        <Animated.View
          onLayout={handleFooterSheetLayout}
          style={[
            styles.footerPanel,
            {
              backgroundColor: hexToRgba(theme.colors.accent, 0.1),
              paddingBottom: insets.bottom,
              opacity: footerOpacity,
              transform: [{ translateY: footerTranslateY }],
            },
          ]}
        >
          <View style={styles.pricingRow}>
            <PriceCard
              productId={subs.left}
              unitLabel={t("shop.subCards.dailyUnit")}
              primaryValue="30"
            />
            <PriceCard
              productId={subs.middle}
              unitLabel={t("shop.subCards.monthlyUnit")}
              primaryValue="12"
            />
            <PriceCard
              productId={subs.right}
              unitLabel={t("shop.subCards.lifetimeUnit")}
              primaryValue="∞"
            />
          </View>

          <View style={styles.footerButtons}>
            <Button
              onPress={() =>
                isPremium
                  ? void handleOpenCustomerCenter()
                  : startPurchase(selectedId)
              }
              disabled={isPremium ? actionLoading !== null : !canPurchase}
            >
              {isPremium
                ? t("shop.manageSubscription")
                : purchasing
                  ? t("common.loading")
                  : t("common.continue")}
            </Button>
          </View>

          <LegalLinksRow
            termsUrl={`${ENV.WEB_APP_URL}/terms`}
            privacyUrl={`${ENV.WEB_APP_URL}/privacy`}
            onRestorePurchases={() => void handleRestorePurchases()}
            restoreLoading={actionLoading === "restore"}
          />
        </Animated.View>

        <Modal
          visible={customerCenterVisible}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={handleCustomerCenterDismiss}
        >
          <View
            style={[
              styles.customerCenterModal,
              { backgroundColor: theme.colors.bg },
            ]}
          >
            <RevenueCatUI.CustomerCenterView
              style={styles.customerCenterView}
              onDismiss={handleCustomerCenterDismiss}
            />
          </View>
        </Modal>
      </View>
    </ModalLayout>
  );
}

export function PremiumHero({ theme }: { theme: AppTheme }) {
  const floats = useRef(HERO_ICONS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = floats.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 180),
          Animated.timing(value, {
            toValue: 1,
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 1800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [floats]);

  return (
    <View style={stylesStatic.logoStage}>
      <View
        style={[
          stylesStatic.logoHalo,
          { backgroundColor: hexToRgba(theme.colors.accent, 0.14) },
        ]}
      />
      <Logo width={118} height={118} />
      {HERO_ICONS.map((iconName, index) => {
        const position = HERO_ICON_POSITIONS[index];
        const { rotation, ...placement } = position;
        const translateY = floats[index].interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, -10, 0],
        });
        const scale = floats[index].interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1, 1.05, 1],
        });

        return (
          <Animated.View
            key={`${iconName}-${index}`}
            style={[
              stylesStatic.floatingBadge,
              placement,
              {
                backgroundColor: hexToRgba(theme.colors.accent, 0.1),
                borderColor: hexToRgba(theme.colors.accent, 0.28),
                transform: [{ translateY }, { scale }, { rotate: rotation }],
              },
            ]}
          >
            <Ionicons name={iconName} size={18} color={theme.colors.accent} />
          </Animated.View>
        );
      })}
    </View>
  );
}

const stylesStatic = StyleSheet.create({
  logoStage: {
    width: 216,
    height: 188,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
  logoHalo: {
    position: "absolute",
    width: 144,
    height: 144,
    borderRadius: 999,
  },
  floatingBadge: {
    position: "absolute",
    width: 42,
    height: 42,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
});

function makeStyles(theme: AppTheme) {
  const { spacing, typography, radius } = theme;
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      paddingTop: spacing.md,
      paddingBottom: spacing.xs,
      paddingHorizontal: spacing.md,
      gap: spacing.md,
    },
    heroSection: {
      gap: spacing.sm,
    },
    heroCopy: {
      alignItems: "center",
      gap: spacing.xs,
    },
    heroTitle: {
      fontSize: typography.largeTitle,
      fontFamily: BRAND_FONT_FAMILY,
      textAlign: "center",
      letterSpacing: -0.6,
    },
    heroSubtitle: {
      fontSize: typography.body,
      lineHeight: typography.body + 7,
      textAlign: "center",
      maxWidth: 360,
    },
    featuresGrid: {
      gap: spacing.sm,
    },
    featureCard: {
      backgroundColor: theme.colors.card,
      flexDirection: "row",
      alignItems: "center",
      padding: spacing.md,
      borderRadius: radius.lg,
    },
    featureIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing.md,
    },
    featureTextWrap: {
      flex: 1,
      gap: spacing.xs / 2,
    },
    featureText: {
      fontSize: typography.body,
      fontWeight: typography.fontWeight.bold,
      lineHeight: typography.body + 6,
    },
    featureLink: {
      fontSize: typography.small,
      fontWeight: typography.fontWeight.bold,
    },
    pricingRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    tierPressable: {
      flex: 1,
      aspectRatio: 1,
      minWidth: 0,
    },
    tierCard: {
      flex: 1,
      width: "100%",
      borderRadius: radius.md + 12,
      borderWidth: 1,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.xs,
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
    },
    tierTopRow: {
      alignItems: "center",
      justifyContent: "center",
    },
    tierValue: {
      fontSize: typography.title,
      fontWeight: typography.fontWeight.bold,
    },
    tierUnit: {
      fontSize: typography.small,
      fontWeight: typography.fontWeight.medium,
      letterSpacing: 1.2,
      textTransform: "uppercase",
    },
    tierPriceRow: {
      marginTop: 4,
    },
    tierPrice: {
      fontSize: typography.body,
      fontWeight: typography.fontWeight.bold,
    },
    scrollDownHint: {
      position: "absolute",
      left: 0,
      right: 0,
      alignItems: "center",
      zIndex: 1,
    },
    footerPanel: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 2,
      paddingTop: spacing.sm,
      paddingHorizontal: spacing.sm,
      gap: spacing.sm,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 14,
    },
    footerButtons: {
      gap: spacing.sm,
    },
    customerCenterModal: {
      flex: 1,
    },
    customerCenterView: {
      flex: 1,
    },
  });
}
