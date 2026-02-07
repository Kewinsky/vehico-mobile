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
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { AppHeader } from "../ui/components/AppHeader";
import { Card } from "../ui/components/Card";
import { Button } from "../ui/components/Button";
import { Screen } from "../ui/components/Screen";
import { hexToRgba } from "../ui/components/ChoiceChip";
import { SegmentTabs } from "../ui/components/SegmentTabs";
import type { AppTheme } from "../ui/theme";
import { useTheme } from "../ui/ThemeProvider";
import { useEntitlements } from "../app/providers/EntitlementsProvider";
import {
  mockPurchase,
  PRODUCTS,
  type Product,
  type ProductId,
} from "../services/payments/mockPurchase";
import { toastError, toastSuccess } from "../ui/toast/toast";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";

type Props = NativeStackScreenProps<AppStackParamList, "Shop">;

type TabKey = "packs" | "subscriptions";

const DEFAULT_PACK: ProductId = "pack_3plus3";
const DEFAULT_SUBSCRIPTION: ProductId = "lifetime";
const LIFETIME_DISCOUNT_PERCENT = 30;

export function ShopScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { refresh, isPremium } = useEntitlements();
  const [purchasing, setPurchasing] = useState<ProductId | null>(null);
  const [tab, setTab] = useState<TabKey>("subscriptions");
  const [selectedPack, setSelectedPack] = useState<ProductId>(DEFAULT_PACK);
  const [selectedSubscription, setSelectedSubscription] =
    useState<ProductId>(DEFAULT_SUBSCRIPTION);
  const styles = useMemo(() => makeStyles(theme), [theme]);

  async function handlePurchase(productId: ProductId) {
    if (purchasing) return;
    try {
      setPurchasing(productId);
      await mockPurchase(productId);
      await refresh();
      toastSuccess(t("shop.purchaseSuccess"));
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setPurchasing(null);
    }
  }

  function confirmPurchase(productId: ProductId) {
    if (purchasing) return;
    if (isPremium) {
      Alert.alert(t("shop.premiumIsActive"), t("shop.premiumIsActiveBody"), [
        { text: "OK" },
      ]);
      return;
    }
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product) {
      toastError(t("shop.unknownProduct"));
      return;
    }
    Alert.alert(
      t("shop.confirmPurchase"),
      `${t(`shop.products.${product.id}.name`)}\n${product.price}\n\n${t(`shop.products.${product.id}.description`)}`,
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("shop.buy"), onPress: () => void handlePurchase(productId) },
      ],
      { cancelable: true },
    );
  }

  const selectedId = tab === "packs" ? selectedPack : selectedSubscription;
  const accentBg = useMemo(
    () => hexToRgba(theme.colors.accent, 0.15),
    [theme.colors.accent],
  );

  function getProduct(productId: ProductId): Product | undefined {
    return PRODUCTS.find((p) => p.id === productId);
  }

  // (old price / crossed-out price intentionally removed for this layout)

  function HeroIconCluster() {
    return (
      <View
        style={[
          styles.heroIconWrap,
          { backgroundColor: theme.colors.accent + "18" },
        ]}
      >
        <View
          style={[
            styles.heroIconDot,
            styles.heroIconDotTop,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Ionicons
            name="car-sport-outline"
            size={24}
            color={theme.colors.accent}
          />
        </View>
        <View
          style={[
            styles.heroIconDot,
            styles.heroIconDotLeft,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Ionicons
            name="document-text-outline"
            size={22}
            color={theme.colors.accent}
          />
        </View>
        <View
          style={[
            styles.heroIconDot,
            styles.heroIconDotRight,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Ionicons
            name="megaphone-outline"
            size={22}
            color={theme.colors.accent}
          />
        </View>
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
    productId: ProductId;
    label: string;
    badge?: string;
  }) {
    const product = getProduct(productId);
    const selected = selectedId === productId;
    const disabled = isPremium || purchasing !== null;
    const price = product?.price ?? "—";

    const cardStyle = [
      styles.optionCard,
      {
        backgroundColor: selected ? accentBg : theme.colors.card,
        borderColor: selected ? theme.colors.accent : theme.colors.border,
      },
    ];

    return (
      <Pressable
        key={productId}
        disabled={disabled}
        onPress={() => {
          if (tab === "packs") setSelectedPack(productId);
          else setSelectedSubscription(productId);
        }}
        style={({ pressed }) => [
          { width: "100%", opacity: pressed && !disabled ? 0.9 : 1 },
        ]}
      >
        <Card style={cardStyle}>
          <View style={styles.optionRow}>
            <View
              style={[
                styles.radioOuter,
                {
                  borderColor: selected ? theme.colors.accent : theme.colors.muted,
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
                  style={[styles.optionTitle, { color: theme.colors.fg }]}
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
                  style={[styles.optionPrice, { color: theme.colors.fg }]}
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

  const canPurchase = !isPremium && purchasing === null;

  const packs = {
    left: "pack_3_reports" as const,
    middle: "pack_3plus3" as const,
    right: "pack_3_listings" as const,
  };

  const subs = {
    left: "premium_monthly" as const,
    middle: "lifetime" as const,
    right: "premium_yearly" as const,
  };

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingHorizontal: theme.layout.contentPaddingHorizontal },
        ]}
      >
        <SegmentTabs<TabKey>
          value={tab}
          options={[
            { value: "packs", label: t("shop.packs") },
            { value: "subscriptions", label: t("shop.subscriptions") },
          ]}
          onChange={setTab}
        />

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
          <HeroIconCluster />
          <Text style={[styles.heroTitle, { color: theme.colors.fg }]}>
            {tab === "subscriptions"
              ? t("shop.unlockPremium")
              : t("shop.packsHeadline")}
          </Text>
          <View style={styles.features}>
            {tab === "subscriptions" ? (
              <>
                <FeatureRow
                  text={t("shop.premiumFeatures.unlimitedVehicles")}
                />
                <FeatureRow text={t("shop.premiumFeatures.photos6x")} />
                <FeatureRow
                  text={t("shop.premiumFeatures.unlimitedReportsPosts")}
                />
                <FeatureRow
                  text={t("shop.premiumFeatures.remindersWorkshops")}
                />
              </>
            ) : (
              <>
                <FeatureRow text={t("shop.packsFeatures.payOnce")} />
                <FeatureRow text={t("shop.packsFeatures.noSubscription")} />
              </>
            )}
          </View>
        </View>

        <View style={styles.pricingSection}>
          <View style={styles.pricingCol}>
            {tab === "packs" ? (
              <>
                <PriceCard
                  productId={packs.left}
                  label={t("shop.packCards.reports")}
                />
                <PriceCard
                  productId={packs.middle}
                  label={t("shop.packCards.reportsPlusPosts")}
                  badge={t("shop.bestDeal")}
                />
                <PriceCard
                  productId={packs.right}
                  label={t("shop.packCards.posts")}
                />
              </>
            ) : (
              <>
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
              </>
            )}
          </View>

          {isPremium && tab === "packs" ? (
            <Text style={[styles.blockedHint, { color: theme.colors.muted }]}>
              {t("shop.packsBlockedWhilePremium")}
            </Text>
          ) : null}

          <View style={{ height: theme.spacing.lg }} />

          <Button
            onPress={() => confirmPurchase(selectedId)}
            disabled={!canPurchase}
          >
            {purchasing
              ? t("common.loading")
              : tab === "packs"
                ? t("shop.buyPack")
                : t("shop.unlockPremium")}
          </Button>

          <View style={{ height: theme.spacing.lg }} />

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
      paddingBottom: spacing.xl,
      paddingTop: spacing.md,
    },
    premiumBadge: {
      flexDirection: "row",
      alignItems: "center",
      padding: spacing.md,
      marginBottom: spacing.lg,
      marginTop: spacing.md,
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
      width: 132,
      height: 132,
      borderRadius: 132 / 2,
      alignItems: "center",
      justifyContent: "center",
    },
    heroIconDot: {
      position: "absolute",
      width: 52,
      height: 52,
      borderRadius: 26,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    heroIconDotTop: {
      top: 18,
    },
    heroIconDotLeft: {
      left: 18,
      bottom: 22,
    },
    heroIconDotRight: {
      right: 18,
      bottom: 22,
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
      paddingTop: spacing.md,
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
