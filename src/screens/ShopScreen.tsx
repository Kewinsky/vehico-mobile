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
import { Screen } from "../ui/components/Screen";
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

const SECTIONS: Array<{
  type: Product["type"];
  titleKey: "packs" | "subscriptions" | "oneTime";
  highlight?: boolean;
}> = [
  { type: "consumable", titleKey: "packs" },
  { type: "subscription", titleKey: "subscriptions" },
  { type: "lifetime", titleKey: "oneTime", highlight: true },
];

export function ShopScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { refresh, isPremium } = useEntitlements();
  const [purchasing, setPurchasing] = useState<ProductId | null>(null);
  const styles = useMemo(() => makeStyles(theme), [theme]);

  async function handlePurchase(productId: ProductId) {
    if (purchasing) return;
    try {
      setPurchasing(productId);
      await mockPurchase(productId);
      await refresh();
      toastSuccess(t("shop.purchaseSuccess"));
      navigation.goBack();
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setPurchasing(null);
    }
  }

  function confirmPurchase(productId: ProductId) {
    if (purchasing) return;
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product) {
      toastError(t("shop.unknownProduct"));
      return;
    }
    const isPremiumProduct =
      product.type === "subscription" || product.type === "lifetime";
    if (isPremium && isPremiumProduct) {
      Alert.alert(t("shop.premiumIsActive"), t("shop.premiumIsActiveBody"), [
        { text: "OK" },
      ]);
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

  function getTapLabel(product: Product): string {
    const isPremiumProduct =
      product.type === "subscription" || product.type === "lifetime";
    return isPremium && isPremiumProduct
      ? t("shop.planActive")
      : t("shop.tapToPurchase");
  }

  function renderProductCard(product: Product, highlight: boolean) {
    const tapLabel = getTapLabel(product);
    const cardStyle = highlight
      ? [styles.productCard, styles.productCardHighlight]
      : styles.productCard;

    return (
      <Pressable
        key={product.id}
        onPress={() => confirmPurchase(product.id)}
        disabled={purchasing !== null}
        style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
      >
        <Card style={cardStyle}>
          <View style={styles.productHeader}>
            <Text style={styles.productName}>
              {t(`shop.products.${product.id}.name`)}
            </Text>
            <View style={styles.productRight}>
              {purchasing === product.id ? (
                <LoadingIndicator size="small" />
              ) : (
                <Text style={styles.productPrice}>{product.price}</Text>
              )}
            </View>
          </View>
          <Text style={styles.productDescription}>
            {t(`shop.products.${product.id}.description`)}
          </Text>
          <Text style={styles.tapHint}>{tapLabel}</Text>
        </Card>
      </Pressable>
    );
  }

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingHorizontal: theme.layout.contentPaddingHorizontal },
        ]}
      >
        <Text style={styles.title}>{t("shop.title")}</Text>

        {isPremium && (
          <Card style={styles.premiumBadge}>
            <Ionicons name="star" size={24} color={theme.colors.accent} />
            <Text style={styles.premiumText}>{t("shop.premiumActive")}</Text>
          </Card>
        )}

        {SECTIONS.map(({ type, titleKey, highlight = false }) => {
          const products = PRODUCTS.filter((p) => p.type === type);
          if (products.length === 0) return null;
          return (
            <View key={type} style={styles.section}>
              <Text style={styles.sectionTitle}>{t(`shop.${titleKey}`)}</Text>
              {products.map((product) => renderProductCard(product, highlight))}
            </View>
          );
        })}
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
    },
    title: {
      fontSize: typography.largeTitle,
      fontWeight: "700",
      marginVertical: spacing.md,
      color: colors.fg,
    },
    premiumBadge: {
      flexDirection: "row",
      alignItems: "center",
      padding: spacing.md,
      marginBottom: spacing.lg,
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
    section: {
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      fontSize: typography.title,
      fontWeight: "600",
      marginBottom: spacing.md,
      color: colors.fg,
    },
    productCard: {
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderRadius: radius.md,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    productCardHighlight: {
      borderColor: colors.accent,
    },
    productHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.xs,
    },
    productRight: {
      alignItems: "flex-end",
      justifyContent: "center",
      minHeight: 20,
    },
    productName: {
      fontSize: typography.title,
      fontWeight: "600",
      flex: 1,
      color: colors.fg,
    },
    productPrice: {
      fontSize: typography.title,
      fontWeight: "700",
      color: colors.accent,
    },
    productDescription: {
      fontSize: typography.small,
      marginBottom: spacing.md,
      color: colors.muted,
    },
    tapHint: {
      fontSize: typography.small,
      fontWeight: "600",
      color: colors.muted,
    },
    note: {
      marginTop: spacing.lg,
      padding: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: colors.bg + "80",
    },
    noteText: {
      fontSize: typography.small,
      textAlign: "center",
      color: colors.muted,
    },
  });
}
