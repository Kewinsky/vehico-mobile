import React, { useCallback, useMemo, useState } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Purchases from "react-native-purchases";
import RevenueCatUI from "react-native-purchases-ui";
import { AnimatedRollingNumber } from "react-native-animated-rolling-numbers";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { Button } from "../../ui/components/common/Button";
import { Card } from "../../ui/components/common/Card";
import { LegalLinksRow } from "../../ui/components/common/LegalLinksRow";
import { ModalLayout } from "../../layouts";
import { hexToRgba } from "../../ui/components/common/ChoiceChip";
import type { AppTheme } from "../../ui/theme";
import { useTheme } from "../../ui/ThemeProvider";
import { useEntitlements } from "../../app/providers/EntitlementsProvider";
import {
  isLifetimeProduct,
  isMonthlyProduct,
  isYearlyProduct,
  REVENUECAT_DEFAULT_SUBSCRIPTION,
  REVENUECAT_PLAN_ORDER,
  REVENUECAT_PRODUCT_IDS,
  type RevenueCatProductId,
} from "../../services/payments/revenuecat";
import { ENV } from "../../config/env";
import {
  toastCaughtError,
  toastError,
  toastSuccess,
} from "../../ui/toast/toast";
import { BRAND_FONT_FAMILY } from "../../ui/components/branding/BrandHero";
import { Logo } from "../../ui/components/branding/Logo";
import { NativeHeaderScrollView } from "../../ui/components/layout/NativeHeaderScrollView";
import { getSubscriptionDisclosure } from "../../utils/subscriptionDisclosure";
import {
  getStoreCurrencyAffixes,
  getStoreFormattingLocale,
} from "../../utils/currencyDisplay";
import { formatRollingGroupedNumber } from "../../utils/numberFormatting";
import { formatDateDisplay } from "../../utils/dateFormatting";
import { getStoreProductPricing } from "../../services/payments/storeProductPricing";
import { ShopCompareRowIcon } from "../../ui/components/shop/ShopCompareRowIcon";
import { Glow } from "../../ui/components/dashboard/Glow";
import { getShopComparisonRows, type ShopCompareRow } from "./shopComparison";

type Props = NativeStackScreenProps<AppStackParamList, "Shop">;

const SHOP_GLOW_ANGLE = 180;

type PlanBadge = { label: string; tone: "save" | "deal" | "monthly" };

export function ShopScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { theme, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = Dimensions.get("window");
  const {
    refresh,
    isPremium,
    currentPlanProductId,
    revenueCatProducts,
    purchaseRevenueCatProduct,
    restoreRevenueCatPurchases,
    isTrial,
    willRenew,
    premiumExpiresAt,
    daysUntilPremiumExpiry,
    showPremiumEndingBanner,
  } = useEntitlements();
  const [purchasing, setPurchasing] = useState<RevenueCatProductId | null>(
    null,
  );
  const [actionLoading, setActionLoading] = useState<"restore" | null>(null);
  const [customerCenterVisible, setCustomerCenterVisible] = useState(false);
  const [selectedSubscription, setSelectedSubscription] =
    useState<RevenueCatProductId>(REVENUECAT_DEFAULT_SUBSCRIPTION);
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const storeLocale = useMemo(() => getStoreFormattingLocale(), []);

  const selectedId = selectedSubscription;

  const exampleReportUrl = `${ENV.REPORTS_APP_URL}/report/example`;
  const comparisonRows = useMemo(
    () => getShopComparisonRows(t, { exampleReportUrl }),
    [exampleReportUrl, t],
  );

  const selectedProduct = revenueCatProducts[selectedId];
  const selectedPricing = useMemo(
    () => getStoreProductPricing(selectedProduct),
    [selectedProduct],
  );
  const selectedPriceString = selectedPricing?.priceString?.trim() || "–";

  const selectedDisclosure = useMemo(
    () => getSubscriptionDisclosure(selectedId, selectedProduct, t),
    [selectedId, selectedProduct, t],
  );

  // Billed amount must be the most conspicuous price (App Store 3.1.2(c)).
  // Do not divide yearly by 12 for the hero figure – monthly equivalents stay subordinate.
  const priceRollingValue = useMemo(() => {
    const raw = selectedPricing?.price;
    if (raw == null || !Number.isFinite(raw) || raw <= 0) return null;
    return raw;
  }, [selectedPricing?.price]);

  const priceRollingFormattedText = useMemo(() => {
    if (priceRollingValue == null) return undefined;
    return formatRollingGroupedNumber(priceRollingValue, 2);
  }, [priceRollingValue]);

  const pricePeriodLabel = useMemo(() => {
    if (isLifetimeProduct(selectedId)) return null;
    if (isYearlyProduct(selectedId)) return t("shop.perYear");
    if (isMonthlyProduct(selectedId)) return t("shop.perMonth");
    return null;
  }, [selectedId, t]);

  const priceSublineText = useMemo(() => {
    if (isLifetimeProduct(selectedId)) {
      return `${selectedDisclosure.length} · ${selectedPriceString}`;
    }
    // Yearly: period + monthly equivalent only (subordinate to billed amount above).
    if (isYearlyProduct(selectedId) && selectedDisclosure.pricePerUnit) {
      return `${selectedDisclosure.length} · ${selectedDisclosure.pricePerUnit}`;
    }
    return selectedDisclosure.length;
  }, [selectedDisclosure, selectedId, selectedPriceString]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const monthlyPremiumPrice = getStoreProductPricing(
    revenueCatProducts[REVENUECAT_PRODUCT_IDS.monthly],
  )?.price;
  const yearlyPremiumPrice = getStoreProductPricing(
    revenueCatProducts[REVENUECAT_PRODUCT_IDS.yearly],
  )?.price;

  const yearlySavePercent = useMemo(() => {
    if (
      monthlyPremiumPrice == null ||
      yearlyPremiumPrice == null ||
      monthlyPremiumPrice <= 0 ||
      yearlyPremiumPrice <= 0
    ) {
      return null;
    }
    const pct = Math.round(
      (1 - yearlyPremiumPrice / (monthlyPremiumPrice * 12)) * 100,
    );
    return pct > 0 ? pct : null;
  }, [monthlyPremiumPrice, yearlyPremiumPrice]);

  const planLabels: Record<RevenueCatProductId, string> = useMemo(
    () => ({
      [REVENUECAT_PRODUCT_IDS.monthly]: t("shop.subCards.monthly"),
      [REVENUECAT_PRODUCT_IDS.yearly]: t("shop.subCards.yearly"),
      [REVENUECAT_PRODUCT_IDS.lifetime]: t("shop.subCards.lifetime"),
    }),
    [t],
  );

  const activePlanDisclosure = useMemo(() => {
    if (!isPremium || !currentPlanProductId) return null;
    return getSubscriptionDisclosure(
      currentPlanProductId,
      revenueCatProducts[currentPlanProductId],
      t,
    );
  }, [currentPlanProductId, isPremium, revenueCatProducts, t]);

  const activePlanLabel = useMemo(() => {
    if (!isPremium) return null;
    if (isTrial) return t("shop.trialPlanName");
    if (currentPlanProductId) return planLabels[currentPlanProductId];
    return t("shop.premiumActive");
  }, [currentPlanProductId, isPremium, isTrial, planLabels, t]);

  const activePlanBadgeLabel = useMemo(() => {
    if (!isPremium) return null;
    if (isTrial) return t("shop.trialBadge");
    if (showPremiumEndingBanner) return t("shop.planEndsSoon");
    return t("shop.planActive");
  }, [isPremium, isTrial, showPremiumEndingBanner, t]);

  const activePlanDetailLines = useMemo(() => {
    if (!isPremium) return [] as string[];
    const lines: string[] = [];
    if (premiumExpiresAt) {
      const date = formatDateDisplay(premiumExpiresAt, i18n.language);
      if (isTrial) {
        lines.push(
          willRenew === true
            ? t("shop.trialConvertsOn", { date })
            : t("shop.trialEndsOn", { date }),
        );
      } else if (willRenew === false) {
        lines.push(t("shop.subscriptionEndsOn", { date }));
      } else if (willRenew === true) {
        lines.push(t("shop.renewsOn", { date }));
      } else if (activePlanDisclosure?.length) {
        lines.push(activePlanDisclosure.length);
      }
    } else if (activePlanDisclosure?.length) {
      lines.push(activePlanDisclosure.length);
    }
    if (
      daysUntilPremiumExpiry != null &&
      daysUntilPremiumExpiry <= 7 &&
      (isTrial || willRenew === false)
    ) {
      lines.push(
        t("shop.daysRemaining", {
          count: daysUntilPremiumExpiry,
        }),
      );
    }
    return lines;
  }, [
    activePlanDisclosure?.length,
    daysUntilPremiumExpiry,
    i18n.language,
    isPremium,
    isTrial,
    premiumExpiresAt,
    t,
    willRenew,
  ]);

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
      toastCaughtError(e, t("common.error"));
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
      toastCaughtError(e, t("common.error"));
    } finally {
      setActionLoading(null);
    }
  }

  function startPurchase(productId: RevenueCatProductId) {
    if (purchasing) return;
    void handlePurchase(productId);
  }

  const canPurchase =
    purchasing === null && actionLoading === null && !isPremium;

  const priceCurrencyDisplay = useMemo(() => {
    if (priceRollingValue == null || !selectedPricing?.currencyCode) {
      return null;
    }
    return getStoreCurrencyAffixes(
      priceRollingValue,
      selectedPricing.currencyCode,
      storeLocale,
    );
  }, [priceRollingValue, selectedPricing?.currencyCode, storeLocale]);

  async function openExampleLink(row: ShopCompareRow) {
    const link = row.exampleLink;
    if (!link) return;
    try {
      if (link.kind === "exampleListing") {
        navigation.navigate("ExampleListing");
        return;
      }
      await WebBrowser.openBrowserAsync(link.url);
    } catch {
      toastError(t("common.error"));
    }
  }

  function planBadge(productId: RevenueCatProductId): PlanBadge | null {
    if (isMonthlyProduct(productId)) {
      return { label: t("shop.monthlyBadge"), tone: "monthly" };
    }
    if (isYearlyProduct(productId) && yearlySavePercent != null) {
      return {
        label: t("shop.saveBadge", { percent: yearlySavePercent }),
        tone: "save",
      };
    }
    if (isLifetimeProduct(productId)) {
      return { label: t("shop.lifetimeBadge"), tone: "deal" };
    }
    return null;
  }

  function badgeColor(badge: PlanBadge, selected: boolean) {
    if (selected) return "#000";
    if (badge.tone === "deal") return theme.colors.accent;
    if (badge.tone === "monthly") return theme.colors.muted;
    return "#22c55e";
  }

  return (
    <ModalLayout
      title={t("shop.title")}
      cancel={{ onPress: () => navigation.goBack(), label: t("common.cancel") }}
      useHorizontalContentInset
      background={
        <Glow
          width={windowWidth}
          height={Math.round(windowHeight * 0.55)}
          mode={mode}
          angle={SHOP_GLOW_ANGLE}
          style={styles.backgroundGlow}
        />
      }
    >
      <NativeHeaderScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + theme.spacing.xl,
          gap: theme.spacing.lg,
        }}
      >
        <View style={styles.logoWrap}>
          <Logo width={88} height={88} />
        </View>

        <View style={styles.headerCopy}>
          <Text style={[styles.pageTitle, { color: theme.colors.fg }]}>
            {t("shop.pageTitle")}
          </Text>
          <Text style={[styles.pageSubtitle, { color: theme.colors.muted }]}>
            {t("shop.pageSubtitle")}
          </Text>
        </View>

        <View
          style={[styles.compareCard, { backgroundColor: theme.colors.card }]}
        >
          <View style={[styles.compareHeaderRow, styles.compareRow]}>
            <View style={styles.compareFeatureCol} />
            <Text
              style={[styles.compareHeaderCell, { color: theme.colors.muted }]}
            >
              {t("shop.compare.columnFree")}
            </Text>
            <Text
              style={[
                styles.compareHeaderCell,
                styles.comparePremiumHeader,
                { color: theme.colors.accent },
              ]}
            >
              {t("shop.compare.columnPremium")}
            </Text>
          </View>

          {comparisonRows.map((row, index) => (
            <View
              key={row.id}
              style={[
                styles.compareRow,
                index < comparisonRows.length - 1 && styles.compareRowBorder,
                { borderBottomColor: theme.colors.border },
              ]}
            >
              <View style={styles.compareFeatureCol}>
                <View style={styles.compareIcon}>
                  <ShopCompareRowIcon
                    icon={row.icon}
                    color={theme.colors.accent}
                  />
                </View>
                <View style={styles.compareLabelWrap}>
                  <Text
                    style={[
                      styles.compareFeatureLabel,
                      { color: theme.colors.fg },
                    ]}
                  >
                    {row.label}
                  </Text>
                  {row.exampleLink ? (
                    <Pressable
                      onPress={() => void openExampleLink(row)}
                      hitSlop={8}
                      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                    >
                      <Text
                        style={[
                          styles.compareExampleLink,
                          { color: theme.colors.accent },
                        ]}
                      >
                        {t("shop.seeExample")}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
              <Text
                style={[styles.compareValue, { color: theme.colors.muted }]}
                numberOfLines={2}
              >
                {row.free}
              </Text>
              <Text
                style={[
                  styles.compareValue,
                  styles.comparePremiumValue,
                  { color: theme.colors.accent },
                ]}
                numberOfLines={2}
              >
                {row.premium}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.planSection}>
          {isPremium ? (
            <>
              <Card
                withoutDividers
                style={[
                  styles.currentPlanCard,
                  {
                    backgroundColor: hexToRgba(theme.colors.accent, 0.15),
                    borderColor: hexToRgba(theme.colors.accent, 0.35),
                  },
                ]}
              >
                <View style={styles.currentPlanCardInner}>
                  <View style={styles.currentPlanHeader}>
                    <Text
                      style={[
                        styles.currentPlanEyebrow,
                        { color: theme.colors.muted },
                      ]}
                    >
                      {t("shop.currentPlan")}
                    </Text>
                    <View
                      style={[
                        styles.currentPlanBadge,
                        { backgroundColor: theme.colors.accent },
                      ]}
                    >
                      <Text style={styles.currentPlanBadgeText}>
                        {activePlanBadgeLabel}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[styles.currentPlanName, { color: theme.colors.fg }]}
                  >
                    {activePlanLabel}
                  </Text>
                  {activePlanDetailLines.map((line) => (
                    <Text
                      key={line}
                      style={[
                        styles.currentPlanDetail,
                        { color: theme.colors.muted },
                      ]}
                    >
                      {line}
                    </Text>
                  ))}
                </View>
              </Card>

              <Button
                onPress={() => void handleOpenCustomerCenter()}
                disabled={actionLoading !== null}
              >
                {t("shop.manageSubscription")}
              </Button>
            </>
          ) : (
            <>
              <View
                style={[
                  styles.planTabs,
                  { backgroundColor: hexToRgba(theme.colors.accent, 0.15) },
                ]}
              >
                {REVENUECAT_PLAN_ORDER.map((planId) => {
                  const selected = selectedId === planId;
                  const badge = planBadge(planId);
                  return (
                    <Pressable
                      key={planId}
                      disabled={purchasing !== null}
                      onPress={() => setSelectedSubscription(planId)}
                      style={({ pressed }) => [
                        styles.planTab,
                        selected && {
                          backgroundColor: theme.colors.accent,
                        },
                        pressed && { opacity: 0.85 },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text
                        style={[
                          styles.planTabLabel,
                          {
                            color: selected ? "#000" : theme.colors.fg,
                          },
                        ]}
                      >
                        {planLabels[planId]}
                      </Text>
                      {badge ? (
                        <Text
                          style={[
                            styles.planTabBadge,
                            { color: badgeColor(badge, selected) },
                          ]}
                          numberOfLines={1}
                        >
                          {badge.label}
                        </Text>
                      ) : (
                        <View style={styles.planTabBadgeSpacer} />
                      )}
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.priceBlock}>
                {priceRollingValue != null ? (
                  <View style={styles.priceRollingRow}>
                    {priceCurrencyDisplay?.prefix ? (
                      <Text
                        style={[
                          styles.priceCurrency,
                          { color: theme.colors.fg },
                        ]}
                      >
                        {priceCurrencyDisplay.prefix}
                      </Text>
                    ) : null}
                    <AnimatedRollingNumber
                      value={priceRollingValue}
                      formattedText={priceRollingFormattedText}
                      spinningAnimationConfig={{ duration: 480 }}
                      textStyle={[
                        styles.priceRollingNumber,
                        { color: theme.colors.fg },
                      ]}
                    />
                    {priceCurrencyDisplay?.suffix ? (
                      <Text
                        style={[
                          styles.priceCurrency,
                          { color: theme.colors.fg },
                        ]}
                      >
                        {priceCurrencyDisplay.suffix}
                      </Text>
                    ) : null}
                    {pricePeriodLabel ? (
                      <Text
                        style={[
                          styles.pricePeriod,
                          { color: theme.colors.muted },
                        ]}
                      >
                        {pricePeriodLabel}
                      </Text>
                    ) : null}
                  </View>
                ) : (
                  <Text
                    style={[styles.priceFallback, { color: theme.colors.fg }]}
                  >
                    {selectedPriceString}
                    {pricePeriodLabel ? ` ${pricePeriodLabel}` : ""}
                  </Text>
                )}
                <Text
                  style={[styles.priceSubline, { color: theme.colors.muted }]}
                >
                  {priceSublineText}
                </Text>
              </View>

              <Button
                onPress={() => startPurchase(selectedId)}
                disabled={!canPurchase}
                loading={purchasing !== null}
              >
                {t("shop.continueCta")}
              </Button>

              <Text
                style={[
                  styles.subscribeSubtitle,
                  { color: theme.colors.muted },
                ]}
              >
                {t("shop.subscribeSubtitle")}
              </Text>

              {selectedDisclosure.isAutoRenewable ? (
                <Text
                  style={[styles.autoRenewNote, { color: theme.colors.muted }]}
                >
                  {Platform.OS === "android"
                    ? t("shop.autoRenewDisclaimerAndroid")
                    : t("shop.autoRenewDisclaimer")}
                </Text>
              ) : null}
            </>
          )}
        </View>

        <LegalLinksRow
          termsUrl={`${ENV.WEB_APP_URL}/terms`}
          privacyUrl={`${ENV.WEB_APP_URL}/privacy`}
          onRestorePurchases={() => void handleRestorePurchases()}
          restoreLoading={actionLoading === "restore"}
        />
      </NativeHeaderScrollView>

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
            onRestoreCompleted={() => {
              void refresh();
            }}
          />
        </View>
      </Modal>
    </ModalLayout>
  );
}

function makeStyles(theme: AppTheme) {
  const { spacing, typography, radius } = theme;
  return StyleSheet.create({
    backgroundGlow: {
      position: "absolute",
      top: 0,
      left: 0,
    },
    logoWrap: {
      alignItems: "center",
      paddingTop: spacing.sm,
    },
    headerCopy: {
      alignItems: "center",
      gap: spacing.xs,
    },
    pageTitle: {
      fontSize: typography.largeTitle,
      fontFamily: BRAND_FONT_FAMILY,
      textAlign: "center",
      letterSpacing: -0.5,
    },
    pageSubtitle: {
      fontSize: typography.body,
      lineHeight: typography.body + 6,
      textAlign: "center",
      maxWidth: 340,
    },
    compareCard: {
      borderRadius: radius.lg,
      overflow: "hidden",
    },
    compareHeaderRow: {
      paddingTop: spacing.sm,
    },
    compareRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      gap: spacing.xs,
    },
    compareRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    compareFeatureCol: {
      flex: 1.35,
      flexDirection: "row",
      alignItems: "center",
      minWidth: 0,
    },
    compareIcon: {
      marginRight: spacing.xs,
      width: 18,
      alignItems: "center",
    },
    compareLabelWrap: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    compareFeatureLabel: {
      fontSize: typography.small,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.small + 4,
    },
    compareExampleLink: {
      fontSize: typography.small - 1,
      fontWeight: typography.fontWeight.bold,
    },
    compareHeaderCell: {
      width: 72,
      fontSize: typography.small,
      fontWeight: typography.fontWeight.bold,
      textAlign: "center",
    },
    comparePremiumHeader: {
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    compareValue: {
      width: 72,
      fontSize: typography.small,
      textAlign: "center",
      lineHeight: typography.small + 3,
    },
    comparePremiumValue: {
      fontWeight: typography.fontWeight.bold,
    },
    planSection: {
      gap: spacing.md,
    },
    currentPlanCard: {
      borderWidth: 1,
    },
    currentPlanCardInner: {
      padding: spacing.md,
      gap: spacing.xs,
    },
    currentPlanHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    currentPlanEyebrow: {
      fontSize: typography.small,
      fontWeight: typography.fontWeight.medium,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    currentPlanBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radius.lg,
    },
    currentPlanBadgeText: {
      fontSize: typography.small - 1,
      fontWeight: typography.fontWeight.bold,
      color: "#000",
    },
    currentPlanName: {
      fontSize: typography.title,
      fontWeight: typography.fontWeight.bold,
    },
    currentPlanDetail: {
      fontSize: typography.small,
      lineHeight: typography.small + 4,
    },
    planTabs: {
      flexDirection: "row",
      borderRadius: radius.lg,
      padding: 4,
      gap: 4,
    },
    planTab: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xs,
      borderRadius: radius.md,
      minHeight: 56,
    },
    planTabLabel: {
      fontSize: typography.small,
      fontWeight: typography.fontWeight.bold,
    },
    planTabBadge: {
      marginTop: 4,
      fontSize: 9,
      fontWeight: typography.fontWeight.bold,
      letterSpacing: 0.3,
      textAlign: "center",
    },
    planTabBadgeSpacer: {
      height: 14,
    },
    priceBlock: {
      alignItems: "center",
      gap: spacing.xs,
    },
    priceRollingRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "center",
      gap: spacing.xs,
    },
    priceRollingNumber: {
      fontSize: 40,
      fontWeight: typography.fontWeight.bold,
      lineHeight: 44,
    },
    priceCurrency: {
      fontSize: typography.title,
      fontWeight: typography.fontWeight.bold,
      marginBottom: 6,
    },
    pricePeriod: {
      fontSize: typography.title,
      fontWeight: typography.fontWeight.medium,
      marginBottom: 4,
    },
    priceFallback: {
      fontSize: typography.title,
      fontWeight: typography.fontWeight.bold,
      textAlign: "center",
    },
    priceSubline: {
      fontSize: typography.small,
      textAlign: "center",
      lineHeight: typography.small + 4,
    },
    subscribeSubtitle: {
      fontSize: typography.small,
      textAlign: "center",
    },
    autoRenewNote: {
      fontSize: 11,
      lineHeight: 15,
      textAlign: "center",
    },
    customerCenterModal: {
      flex: 1,
    },
    customerCenterView: {
      flex: 1,
    },
  });
}
