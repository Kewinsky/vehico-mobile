import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Purchases from "react-native-purchases";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { AppNavbar } from "../ui/components/AppNavbar";
import { Card } from "../ui/components/Card";
import { Button } from "../ui/components/Button";
import { LegalLinksRow } from "../ui/components/LegalLinksRow";
import { AppLayout } from "../ui/components/AppLayout";
import { hexToRgba } from "../ui/components/ChoiceChip";
import type { AppTheme } from "../ui/theme";
import { useTheme } from "../ui/ThemeProvider";
import { useEntitlements } from "../app/providers/EntitlementsProvider";
import type { RevenueCatProductId } from "../services/payments/revenuecat";
import { ENV } from "../config/env";
import { toastError, toastSuccess } from "../ui/toast/toast";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";
import { Crown } from "lucide-react-native";

type Props = NativeStackScreenProps<AppStackParamList, "Shop">;
const DEFAULT_SUBSCRIPTION: RevenueCatProductId = "lifetime";
const LIFETIME_DISCOUNT_PERCENT = 30;

export function ShopScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const {
    refresh,
    isPremium,
    currentPlanProductId,
    revenueCatProducts,
    purchaseRevenueCatProduct,
    restoreRevenueCatPurchases,
    presentRevenueCatCustomerCenter,
  } = useEntitlements();
  const [purchasing, setPurchasing] = useState<RevenueCatProductId | null>(
    null,
  );
  const [actionLoading, setActionLoading] = useState<
    "restore" | "customerCenter" | null
  >(null);
  const [selectedSubscription, setSelectedSubscription] =
    useState<RevenueCatProductId>(DEFAULT_SUBSCRIPTION);
  const styles = useMemo(() => makeStyles(theme), [theme]);

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

  async function handleOpenCustomerCenter() {
    if (actionLoading || purchasing) return;
    try {
      setActionLoading("customerCenter");
      await presentRevenueCatCustomerCenter();
      await refresh();
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setActionLoading(null);
    }
  }

  function getProductName(productId: RevenueCatProductId): string {
    switch (productId) {
      case "monthly":
        return t("shop.subCards.monthly");
      case "yearly":
        return t("shop.subCards.yearly");
      case "lifetime":
        return t("shop.subCards.lifetime");
      default:
        return productId;
    }
  }

  function getProductDescription(productId: RevenueCatProductId): string {
    const fallbackMap: Record<RevenueCatProductId, string> = {
      monthly: t("shop.products.premium_monthly.description"),
      yearly: t("shop.products.premium_yearly.description"),
      lifetime: t("shop.products.lifetime.description"),
    };
    return revenueCatProducts[productId]?.description ?? fallbackMap[productId];
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

  // (old price / crossed-out price intentionally removed for this layout)

  function HeroPremiumIcon() {
    return (
      <View
        style={[
          styles.heroIconWrap,
          { backgroundColor: theme.colors.accent + "18" },
        ]}
      >
        <Crown size={64} color={theme.colors.accent} />
      </View>
    );
  }

  const exampleReportUrl = `${ENV.REPORTS_APP_URL}/report/example`;

  function FeatureRow({
    text,
    link,
  }: {
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
      <View style={styles.featureRow}>
        <View
          style={[
            styles.featureIcon,
            { backgroundColor: theme.colors.accent + "18" },
          ]}
        >
          <Ionicons name="checkmark" size={16} color={theme.colors.accent} />
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
    label,
    badge,
  }: {
    productId: RevenueCatProductId;
    label: string;
    badge?: string;
  }) {
    const selected = selectedId === productId;
    const disabled = isPremium || purchasing !== null || actionLoading !== null;
    const grayedOut = isPremium && !selected;
    const price = getProductPrice(productId);

    const cardStyle = [
      styles.optionCard,
      {
        backgroundColor: grayedOut
          ? theme.colors.border + "40"
          : selected
            ? accentBg
            : theme.colors.card,
        borderColor: grayedOut
          ? theme.colors.border
          : selected
            ? theme.colors.accent
            : theme.colors.border,
      },
    ];

    return (
      <Pressable
        key={productId}
        disabled={disabled}
        onPress={() => {
          if (!isPremium) setSelectedSubscription(productId);
        }}
        style={({ pressed }) => [
          {
            width: "100%",
            opacity: grayedOut ? 0.6 : pressed && !disabled ? 0.9 : 1,
          },
        ]}
      >
        <Card style={cardStyle}>
          <View style={styles.optionRow}>
            <View
              style={[
                styles.radioOuter,
                {
                  borderColor: selected
                    ? theme.colors.accent
                    : theme.colors.muted,
                  backgroundColor: "transparent",
                },
              ]}
            >
              {selected ? (
                <View
                  style={[
                    styles.radioInner,
                    { backgroundColor: theme.colors.accent },
                  ]}
                />
              ) : null}
            </View>

            <View style={styles.optionMain}>
              <View style={styles.optionTitleRow}>
                <Text
                  style={[
                    styles.optionTitle,
                    { color: grayedOut ? theme.colors.muted : theme.colors.fg },
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
                {badge ? (
                  <View
                    style={[
                      styles.inlineBadge,
                      {
                        backgroundColor: theme.colors.accent,
                        borderColor: theme.colors.accent,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.inlineBadgeText, { color: "#000000" }]}
                    >
                      {badge}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.optionRight}>
              {purchasing === productId ? (
                <LoadingIndicator size="small" />
              ) : (
                <Text
                  style={[
                    styles.optionPrice,
                    {
                      color: grayedOut ? theme.colors.muted : theme.colors.fg,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {price}
                </Text>
              )}
            </View>
          </View>
        </Card>
      </Pressable>
    );
  }

  const canPurchase =
    purchasing === null && actionLoading === null && !isPremium;

  const subs: Record<"left" | "middle" | "right", RevenueCatProductId> = {
    left: "monthly" as const,
    middle: "lifetime" as const,
    right: "yearly" as const,
  };

  return (
    <AppLayout
      header={<AppNavbar onBack={() => navigation.goBack()} />}
      footer={
        <>
          <View style={styles.footerButtons}>
            {isPremium ? (
              <Button
                onPress={() => void handleOpenCustomerCenter()}
                disabled={actionLoading !== null}
              >
                {actionLoading === "customerCenter"
                  ? t("common.loading")
                  : t("shop.manageSubscription")}
              </Button>
            ) : (
              <Button
                onPress={() => startPurchase(selectedId)}
                disabled={!canPurchase}
              >
                {purchasing ? t("common.loading") : t("shop.unlockPremium")}
              </Button>
            )}
          </View>
          <LegalLinksRow
            termsUrl={`${ENV.WEB_APP_URL}/terms`}
            privacyUrl={`${ENV.WEB_APP_URL}/privacy`}
          />
        </>
      }
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {isPremium && (
          <Card style={styles.premiumBadge}>
            <Ionicons name="star" size={24} color={theme.colors.accent} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.premiumText}>{t("shop.premiumActive")}</Text>
              <Text
                style={[styles.premiumSubtext, { color: theme.colors.muted }]}
              >
                {t("shop.currentPlan")}
              </Text>
            </View>
          </Card>
        )}

        <View style={styles.hero}>
          <HeroPremiumIcon />
          <Text style={[styles.heroTitle, { color: theme.colors.fg }]}>
            {t("shop.unlockPremium")}
          </Text>
          <View style={styles.features}>
            <FeatureRow text={t("shop.premiumFeatures.unlimitedVehicles")} />
            <FeatureRow
              text={t("shop.premiumFeatures.onlineReports")}
              link={{
                label: t("shop.premiumFeatures.onlineReportsLink"),
                url: exampleReportUrl,
              }}
            />
            <FeatureRow
              text={t("shop.premiumFeatures.marketplaceListings")}
              link={{
                label: t("shop.premiumFeatures.marketplaceListingsLink"),
                onPress: () => navigation.navigate("ExampleListing"),
              }}
            />
            <FeatureRow text={t("shop.premiumFeatures.remindersWorkshops")} />
          </View>
        </View>

        <View style={styles.pricingCol}>
          <PriceCard productId={subs.left} label={t("shop.subCards.monthly")} />
          <PriceCard
            productId={subs.middle}
            label={t("shop.subCards.lifetime")}
            badge={t("shop.saveDiscountBadge", {
              percent: LIFETIME_DISCOUNT_PERCENT,
            })}
          />
          <PriceCard productId={subs.right} label={t("shop.subCards.yearly")} />
        </View>
      </ScrollView>
    </AppLayout>
  );
}

function makeStyles(theme: AppTheme) {
  const { colors, spacing, typography, radius } = theme;
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      paddingBottom: spacing.xl * 2,
      paddingTop: spacing.md,
    },
    premiumBadge: {
      flexDirection: "row",
      alignItems: "center",
      padding: spacing.md,
      gap: spacing.sm,
      borderWidth: 2,
      borderColor: colors.accent,
      backgroundColor: colors.accent + "20",
    },
    premiumText: {
      fontSize: typography.body,
      fontWeight: typography.fontWeight.bold,
      color: colors.accent,
    },
    premiumSubtext: {
      marginTop: 2,
      fontSize: typography.body,
      fontWeight: typography.fontWeight.bold,
    },
    hero: {
      alignItems: "center",
      paddingTop: spacing.lg,
      paddingBottom: spacing.lg,
      gap: spacing.md,
    },
    heroIconWrap: {
      width: 100,
      height: 100,
      borderRadius: 50,
      alignItems: "center",
      justifyContent: "center",
    },
    heroTitle: {
      fontSize: typography.title,
      fontWeight: typography.fontWeight.bold,
      textAlign: "center",
    },
    features: {
      width: "100%",
      maxWidth: 420,
      gap: spacing.sm,
      paddingTop: spacing.xs,
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    featureIcon: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
    },
    featureTextWrap: {
      flex: 1,
      minWidth: 0,
      gap: spacing.xs / 2,
    },
    featureText: {
      fontSize: typography.body,
      fontWeight: typography.fontWeight.bold,
    },
    featureLink: {
      fontSize: typography.small,
      fontWeight: typography.fontWeight.bold,
    },
    pricingCol: {
      flexDirection: "column",
      gap: spacing.sm,
      alignItems: "stretch",
    },
    optionCard: {
      borderRadius: radius.md + 8,
    },
    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: spacing.md,
      minHeight: 72,
    },
    radioOuter: {
      width: 22,
      height: 22,
      borderRadius: 999,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
    },
    radioInner: {
      width: 10,
      height: 10,
      borderRadius: 999,
    },
    optionMain: {
      flex: 1,
      minWidth: 0,
    },
    optionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      minWidth: 0,
    },
    optionTitle: {
      fontSize: typography.body,
      fontWeight: typography.fontWeight.bold,
      flexShrink: 1,
      minWidth: 0,
    },
    inlineBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
      flexShrink: 0,
    },
    inlineBadgeText: {
      fontSize: typography.small,
    },
    optionRight: {
      alignItems: "flex-end",
      justifyContent: "center",
      minWidth: 76,
    },
    optionPrice: {
      fontSize: typography.body,
      fontWeight: typography.fontWeight.bold,
    },
    blockedHint: {
      marginTop: spacing.md,
      fontSize: typography.body,
      textAlign: "center",
      fontWeight: typography.fontWeight.bold,
    },
    footerButtons: {
      gap: spacing.sm,
    },
  });
}
