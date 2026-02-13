import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Purchases from "react-native-purchases";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { AppHeader } from "../ui/components/AppHeader";
import { Card } from "../ui/components/Card";
import { Button } from "../ui/components/Button";
import { Screen } from "../ui/components/Screen";
import { hexToRgba } from "../ui/components/ChoiceChip";
import type { AppTheme } from "../ui/theme";
import { useTheme } from "../ui/ThemeProvider";
import { useEntitlements } from "../app/providers/EntitlementsProvider";
import type { RevenueCatProductId } from "../services/payments/revenuecat";
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

  function confirmPurchase(productId: RevenueCatProductId) {
    if (purchasing) return;
    if (isPremium) {
      Alert.alert(t("shop.premiumIsActive"), t("shop.premiumIsActiveBody"), [
        { text: "OK" },
      ]);
      return;
    }
    const price = revenueCatProducts[productId]?.priceString ?? "—";

    Alert.alert(
      t("shop.confirmPurchase"),
      `${getProductName(productId)}\n${price}\n\n${getProductDescription(productId)}`,
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("shop.buy"), onPress: () => void handlePurchase(productId) },
      ],
      { cancelable: true },
    );
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
        <Crown
          size={64}
          color={theme.colors.accent}
        />
      </View>
    );
  }

  function FeatureRow({ text }: { text: string }) {
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
        <Text style={[styles.featureText, { color: theme.colors.fg }]}>
          {text}
        </Text>
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
    <Screen
      padding={false}
      header={<AppHeader onBack={() => navigation.goBack()} />}
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
                onPress={() => confirmPurchase(selectedId)}
                disabled={!canPurchase}
              >
                {purchasing ? t("common.loading") : t("shop.unlockPremium")}
              </Button>
            )}
          </View>
          <View style={styles.footerRow}>
            <Pressable
              onPress={() => navigation.navigate("TermsOfUse")}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={[styles.footerLink, { color: theme.colors.accent }]}>
                {t("terms.title")}
              </Text>
            </Pressable>
            <Text style={[styles.footerText, { color: theme.colors.muted }]}>
              {" "}
              {t("common.and")}{" "}
            </Text>
            <Pressable
              onPress={() => navigation.navigate("PrivacyPolicy")}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={[styles.footerLink, { color: theme.colors.accent }]}>
                {t("privacy.title")}
              </Text>
            </Pressable>
          </View>
        </>
      }
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingHorizontal: theme.layout.contentPaddingHorizontal },
        ]}
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
            <FeatureRow text={t("shop.premiumFeatures.photos6x")} />
            <FeatureRow
              text={t("shop.premiumFeatures.unlimitedReportsPosts")}
            />
            <FeatureRow text={t("shop.premiumFeatures.remindersWorkshops")} />
          </View>
        </View>

        <View style={styles.pricingSection}>
          <View style={styles.pricingCol}>
            <PriceCard
              productId={subs.left}
              label={t("shop.subCards.monthly")}
            />
            <PriceCard
              productId={subs.middle}
              label={t("shop.subCards.lifetime")}
              badge={t("shop.saveDiscountBadge", {
                percent: LIFETIME_DISCOUNT_PERCENT,
              })}
            />
            <PriceCard
              productId={subs.right}
              label={t("shop.subCards.yearly")}
            />
          </View>
        </View>
      </ScrollView>
    </Screen>
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
      fontWeight: "600",
      color: colors.accent,
    },
    premiumSubtext: {
      marginTop: 2,
      fontSize: typography.body,
      fontWeight: "600",
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
      fontWeight: "700",
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
    featureText: {
      flex: 1,
      minWidth: 0,
      fontSize: typography.body,
      fontWeight: "600",
    },
    pricingSection: {
      paddingTop: spacing.lg,
      paddingHorizontal: spacing.md,
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
      fontWeight: "700",
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
      fontWeight: "700",
    },
    blockedHint: {
      marginTop: spacing.md,
      fontSize: typography.body,
      textAlign: "center",
      fontWeight: "600",
    },
    footerButtons: {
      gap: spacing.sm,
    },
    footerRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      alignItems: "center",
      paddingTop: spacing.sm,
      gap: 2,
    },
    footerText: {
      fontSize: typography.small,
    },
    footerLink: {
      fontSize: typography.small,
      fontWeight: "600",
      textDecorationLine: "underline",
    },
  });
}
