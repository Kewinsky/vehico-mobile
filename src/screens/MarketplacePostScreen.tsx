import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import * as Clipboard from "expo-clipboard";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import type { Language } from "../types/domain";
import {
  generateMarketplacePost,
  saveMarketplacePost,
} from "../services/marketplace/marketplaceRepo";
import { Button } from "../ui/components/Button";
import { AppHeader } from "../ui/components/AppHeader";
import { FormScreen } from "../ui/components/FormScreen";
import { TextField } from "../ui/components/TextField";
import { PickerField } from "../ui/components/PickerField";
import { useTheme } from "../ui/ThemeProvider";
import { toastError, toastSuccess } from "../ui/toast/toast";
import { useUserSettings } from "../app/providers/UserSettingsProvider";

type Props = NativeStackScreenProps<AppStackParamList, "MarketplacePost">;

export function MarketplacePostScreen({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const { theme, mode } = useTheme();
  const { settings } = useUserSettings();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { vehicleId } = route.params;

  const [language, setLanguage] = useState<Language>(
    (i18n.language as Language) || (settings?.language as Language) || "pl"
  );
  const [price, setPrice] = useState("");
  const [content, setContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const currency = settings?.currency ?? "PLN";

  async function handleGenerate() {
    try {
      setGenerating(true);
      const priceNum = price.trim().length ? Number(price) : null;
      if (price.trim().length && !Number.isFinite(priceNum)) {
        throw new Error(t("marketplace.invalidPrice"));
      }

      const generated = await generateMarketplacePost({
        vehicleId,
        language,
        price: priceNum,
      });

      setContent(generated);
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    try {
      if (!content.trim()) {
        toastError(t("common.error"), t("marketplace.noContentToCopy"));
        return;
      }
      await Clipboard.setStringAsync(content);
      toastSuccess(t("marketplace.copiedToClipboard"));
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    }
  }

  async function handleSave() {
    try {
      if (!content.trim()) {
        toastError(t("common.error"), t("marketplace.noContentToSave"));
        return;
      }

      setSaving(true);
      const priceNum = price.trim().length ? Number(price) : null;

      await saveMarketplacePost({
        vehicleId,
        language,
        price: priceNum,
        content,
      });
      toastSuccess(t("marketplace.saved"));
      setContent("");
      setPrice("");
    } catch (e: any) {
      toastError(t("common.error"), e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }


  async function handleRegenerate() {
    Alert.alert(
      t("marketplace.regenerateTitle"),
      t("marketplace.regenerateBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("marketplace.regenerate"),
          style: "destructive",
          onPress: () => {
            setContent("");
            void handleGenerate();
          },
        },
      ]
    );
  }

  return (
    <FormScreen
      header={<AppHeader onBack={() => navigation.goBack()} />}
    >
      <View style={{ height: theme.spacing.md }} />

      <Text style={styles.h1}>{t("marketplace.title")}</Text>

      <View style={{ height: theme.spacing.md }} />

      <Button
        onPress={() =>
          navigation.navigate("MarketplacePostHistory", {
            vehicleId,
            title: route.params.title,
          })
        }
        variant="ghost"
      >
        {t("marketplace.viewHistory")}
      </Button>

      <View style={{ height: theme.spacing.md }} />

      <PickerField
        noMarginTop
        label={t("marketplace.languageLabel")}
        value={language}
        options={["en", "pl"] as const}
        getLabel={(value) =>
          value === "en" ? t("marketplace.languageEn") : t("marketplace.languagePl")
        }
        onChange={(value) => {
          if (value) setLanguage(value);
        }}
      />

      <TextField
        label={t("marketplace.priceLabel")}
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        placeholder={t("marketplace.pricePlaceholder", { currency })}
      />

      <View style={{ height: theme.spacing.md }} />

      <Button onPress={handleGenerate} disabled={generating || saving}>
        {generating ? (
          <View style={styles.loadingRow}>
            <Text style={[styles.buttonText, { color: "#000000" }]}>
              {t("marketplace.generating")}
            </Text>
          </View>
        ) : (
          t("marketplace.generate")
        )}
      </Button>

      {content ? (
        <>
          <View style={{ height: theme.spacing.md }} />

          <Text style={styles.label}>{t("marketplace.contentLabel")}</Text>
          <View style={{ height: theme.spacing.xs }} />

          <View
            style={[
              styles.textAreaContainer,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
              },
            ]}
          >
            <TextInput
              style={[styles.textArea, { color: theme.colors.fg }]}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
              placeholder={t("marketplace.contentPlaceholder")}
              placeholderTextColor={theme.colors.muted}
              keyboardAppearance={mode === "dark" ? "dark" : "light"}
            />
          </View>

          <View style={{ height: theme.spacing.sm }} />

          <View style={styles.actionsRow}>
            <View style={{ flex: 1 }}>
              <Button
                onPress={handleCopy}
                variant="ghost"
                disabled={generating || saving}
              >
                {t("marketplace.copyToClipboard")}
              </Button>
            </View>
            <View style={{ flex: 1 }}>
              <Button
                onPress={() => {
                  if (!saving && !generating) {
                    void handleSave();
                  }
                }}
                disabled={generating || saving}
              >
                {saving ? (
                  <View style={styles.loadingRow}>
                    <Text style={[styles.buttonText, { color: "#000000", marginLeft: theme.spacing.xs }]}>
                      {t("marketplace.saving")}
                    </Text>
                  </View>
                ) : (
                  t("marketplace.savePost")
                )}
              </Button>
            </View>
          </View>

          <View style={{ height: theme.spacing.sm }} />

          <Button
            onPress={handleRegenerate}
            variant="ghost"
            disabled={generating || saving}
          >
            {t("marketplace.regenerate")}
          </Button>
        </>
      ) : null}

      <View style={{ height: theme.spacing.md }} />
    </FormScreen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    h1: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.colors.fg,
    },
    label: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.muted,
    },
    textAreaContainer: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      minHeight: 300,
      padding: theme.spacing.sm,
    },
    textArea: {
      flex: 1,
      fontSize: 14,
      fontFamily: "monospace",
      lineHeight: 20,
    },
    actionsRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    buttonText: {
      fontSize: 15,
      fontWeight: "700",
    },
    loadingContainer: {
      padding: theme.spacing.md,
      alignItems: "center",
    },
  });
