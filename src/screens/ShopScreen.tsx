import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { AppHeader } from "../ui/components/AppHeader";
import { Card } from "../ui/components/Card";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { useEntitlements } from "../app/providers/EntitlementsProvider";
import { useUserSettings } from "../app/providers/UserSettingsProvider";
import { mockPurchase, PRODUCTS, type ProductId } from "../services/payments/mockPurchase";
import { toastError, toastSuccess } from "../ui/toast/toast";
import { LoadingIndicator } from "../ui/components/LoadingIndicator";

type Props = NativeStackScreenProps<AppStackParamList, "Shop">;

export function ShopScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { entitlements, refresh, isPremium } = useEntitlements();
  const { settings } = useUserSettings();
  const [purchasing, setPurchasing] = useState<ProductId | null>(null);
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const language = settings?.language ?? "en";

  async function handlePurchase(productId: ProductId) {
    if (purchasing) return;

    try {
      setPurchasing(productId);
      await mockPurchase(productId);
      await refresh();
      toastSuccess(
        language === "pl" ? "Zakup zakończony pomyślnie!" : "Purchase completed successfully!"
      );
      // Navigate back if came from a blocked screen
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
      toastError(language === "pl" ? "Nieznany produkt" : "Unknown product");
      return;
    }

    const isPremiumProduct = product.type === "subscription" || product.type === "lifetime";
    if (isPremium && isPremiumProduct) {
      Alert.alert(
        language === "pl" ? "Premium jest aktywne" : "Premium is active",
        language === "pl"
          ? "Masz już aktywny plan Premium. Zakup nie jest potrzebny."
          : "You already have an active Premium plan. No purchase needed.",
        [{ text: language === "pl" ? "OK" : "OK" }]
      );
      return;
    }

    Alert.alert(
      language === "pl" ? "Potwierdź zakup" : "Confirm purchase",
      `${language === "pl" ? product.namePl : product.name}\n${product.price}\n\n${
        language === "pl" ? product.descriptionPl : product.description
      }`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: language === "pl" ? "Kup" : "Buy",
          onPress: () => void handlePurchase(productId),
        },
      ],
      { cancelable: true }
    );
  }

  const consumableProducts = PRODUCTS.filter((p) => p.type === "consumable");
  const subscriptionProducts = PRODUCTS.filter((p) => p.type === "subscription");
  const lifetimeProducts = PRODUCTS.filter((p) => p.type === "lifetime");

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingHorizontal: theme.layout.contentPaddingHorizontal },
        ]}
      >
        <Text style={[styles.title, { color: theme.colors.fg }]}>
          {language === "pl" ? "Sklep" : "Shop"}
        </Text>

        {isPremium && (
          <Card
            style={[
              styles.premiumBadge,
              {
                backgroundColor: theme.colors.accent + "20",
                borderColor: theme.colors.accent,
              },
            ]}
          >
            <Ionicons name="star" size={24} color={theme.colors.accent} />
            <Text style={[styles.premiumText, { color: theme.colors.accent }]}>
              {language === "pl"
                ? "Masz aktywny plan Premium"
                : "You have an active Premium plan"}
            </Text>
          </Card>
        )}

        {/* Consumable packs */}
        {consumableProducts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
              {language === "pl" ? "Paczki" : "Packs"}
            </Text>
            {consumableProducts.map((product) => (
              <Pressable
                key={product.id}
                onPress={() => confirmPurchase(product.id)}
                disabled={purchasing !== null}
                style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
              >
                <Card
                  style={[
                    styles.productCard,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.card,
                    },
                  ]}
                >
                  <View style={styles.productHeader}>
                    <Text style={[styles.productName, { color: theme.colors.fg }]}>
                      {language === "pl" ? product.namePl : product.name}
                    </Text>
                    <View style={styles.productRight}>
                      {purchasing === product.id ? (
                        <LoadingIndicator size="small" />
                      ) : (
                        <Text
                          style={[styles.productPrice, { color: theme.colors.accent }]}
                        >
                          {product.price}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text
                    style={[styles.productDescription, { color: theme.colors.muted }]}
                  >
                    {language === "pl" ? product.descriptionPl : product.description}
                  </Text>
                  <Text style={[styles.tapHint, { color: theme.colors.muted }]}>
                    {language === "pl" ? "Kliknij, aby kupić" : "Tap to purchase"}
                  </Text>
                </Card>
              </Pressable>
            ))}
          </View>
        )}

        {/* Subscriptions */}
        {subscriptionProducts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
              {language === "pl" ? "Subskrypcje" : "Subscriptions"}
            </Text>
            {subscriptionProducts.map((product) => (
              <Pressable
                key={product.id}
                onPress={() => confirmPurchase(product.id)}
                disabled={purchasing !== null}
                style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
              >
                <Card
                  style={[
                    styles.productCard,
                    {
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.card,
                    },
                  ]}
                >
                  <View style={styles.productHeader}>
                    <Text style={[styles.productName, { color: theme.colors.fg }]}>
                      {language === "pl" ? product.namePl : product.name}
                    </Text>
                    <View style={styles.productRight}>
                      {purchasing === product.id ? (
                        <LoadingIndicator size="small" />
                      ) : (
                        <Text
                          style={[styles.productPrice, { color: theme.colors.accent }]}
                        >
                          {product.price}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text
                    style={[styles.productDescription, { color: theme.colors.muted }]}
                  >
                    {language === "pl" ? product.descriptionPl : product.description}
                  </Text>
                  <Text style={[styles.tapHint, { color: theme.colors.muted }]}>
                    {isPremium
                      ? language === "pl"
                        ? "Plan aktywny"
                        : "Plan active"
                      : language === "pl"
                        ? "Kliknij, aby kupić"
                        : "Tap to purchase"}
                  </Text>
                </Card>
              </Pressable>
            ))}
          </View>
        )}

        {/* Lifetime */}
        {lifetimeProducts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.fg }]}>
              {language === "pl" ? "Jednorazowy zakup" : "One-time purchase"}
            </Text>
            {lifetimeProducts.map((product) => (
              <Pressable
                key={product.id}
                onPress={() => confirmPurchase(product.id)}
                disabled={purchasing !== null}
                style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
              >
                <Card
                  style={[
                    styles.productCard,
                    {
                      borderColor: theme.colors.accent,
                      backgroundColor: theme.colors.card,
                    },
                  ]}
                >
                  <View style={styles.productHeader}>
                    <Text style={[styles.productName, { color: theme.colors.fg }]}>
                      {language === "pl" ? product.namePl : product.name}
                    </Text>
                    <View style={styles.productRight}>
                      {purchasing === product.id ? (
                        <LoadingIndicator size="small" />
                      ) : (
                        <Text
                          style={[styles.productPrice, { color: theme.colors.accent }]}
                        >
                          {product.price}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text
                    style={[styles.productDescription, { color: theme.colors.muted }]}
                  >
                    {language === "pl" ? product.descriptionPl : product.description}
                  </Text>
                  <Text style={[styles.tapHint, { color: theme.colors.muted }]}>
                    {isPremium
                      ? language === "pl"
                        ? "Plan aktywny"
                        : "Plan active"
                      : language === "pl"
                        ? "Kliknij, aby kupić"
                        : "Tap to purchase"}
                  </Text>
                </Card>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.note}>
          <Text style={[styles.noteText, { color: theme.colors.muted }]}>
            {language === "pl"
              ? "💡 To jest wersja testowa. Płatności są symulowane."
              : "💡 This is a test version. Payments are simulated."}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    container: {
      paddingVertical: theme.layout.contentPaddingVertical,
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      marginBottom: 24,
    },
    premiumBadge: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      marginBottom: 24,
      gap: 12,
      borderWidth: 2,
    },
    premiumText: {
      fontSize: 16,
      fontWeight: "600",
    },
    section: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "600",
      marginBottom: 16,
    },
    productCard: {
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
    },
    productHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    productRight: {
      alignItems: "flex-end",
      justifyContent: "center",
      minHeight: 20,
    },
    productName: {
      fontSize: 18,
      fontWeight: "600",
      flex: 1,
    },
    productPrice: {
      fontSize: 18,
      fontWeight: "700",
    },
    productDescription: {
      fontSize: 14,
      marginBottom: 16,
    },
    tapHint: {
      fontSize: 12,
      fontWeight: "600",
    },
    note: {
      marginTop: 24,
      padding: 16,
      borderRadius: 8,
      backgroundColor: theme.colors.bg + "80",
    },
    noteText: {
      fontSize: 12,
      textAlign: "center",
    },
  });
}
