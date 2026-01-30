import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { useAuth } from "../app/providers/AuthProvider";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { Screen } from "../ui/components/Screen";
import { TextField } from "../ui/components/TextField";
import { useTheme } from "../ui/ThemeProvider";
import { toastError, toastSuccess } from "../ui/toast/toast";
import { supabase } from "../services/supabase/client";

type Props = NativeStackScreenProps<AppStackParamList, "Profile">;

export function ProfileScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user, signOut } = useAuth();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const displayNameFromUser =
    (user?.user_metadata?.full_name as string | undefined)?.trim() || "";
  const [displayName, setDisplayName] = useState(displayNameFromUser);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayName(displayNameFromUser);
  }, [displayNameFromUser]);

  const email = user?.email ?? "";

  const saveDisplayName = useCallback(async () => {
    const trimmed = displayName.trim();
    if (trimmed === displayNameFromUser) return;
    try {
      setSaving(true);
      const { error } = await supabase.auth.updateUser({
        data: { full_name: trimmed || null },
      });
      if (error) throw error;
      toastSuccess(t("profile.displayNameUpdated"));
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setSaving(false);
    }
  }, [displayName, displayNameFromUser, t]);

  function onSignOut() {
    signOut().catch((e: any) => {
      toastError(e?.message ?? t("common.error"));
    });
  }

  function onDeleteAccount() {
    Alert.alert(
      t("profile.deleteAccountConfirmTitle"),
      t("profile.deleteAccountConfirmBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            toastError(t("profile.deleteAccountNotAvailable"));
          },
        },
      ],
    );
  }

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingHorizontal: theme.spacing.md },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: theme.colors.fg }]}>
          {t("profile.title")}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          {t("profile.subtitle")}
        </Text>

        <View
          style={[
            styles.card,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
            },
          ]}
        >
          <Text style={[styles.sectionLabel, { color: theme.colors.muted }]}>
            {t("profile.displayName")}
          </Text>
          <TextField
            value={displayName}
            onChangeText={setDisplayName}
            placeholder={t("profile.displayNamePlaceholder")}
            autoCapitalize="words"
            autoCorrect={false}
          />
          <Button
            onPress={() => void saveDisplayName()}
            variant="ghost"
            disabled={saving || displayName.trim() === displayNameFromUser}
          >
            {saving ? t("common.loading") : t("common.save")}
          </Button>

          <View
            style={[styles.divider, { backgroundColor: theme.colors.border }]}
          />

          <Text style={[styles.sectionLabel, { color: theme.colors.muted }]}>
            {t("profile.email")}
          </Text>
          <Text style={[styles.readOnlyValue, { color: theme.colors.fg }]}>
            {email || "—"}
          </Text>
          <Text style={[styles.helper, { color: theme.colors.muted }]}>
            {t("profile.emailReadOnly")}
          </Text>
        </View>

        <View style={styles.spacer} />

        <Pressable
          onPress={() => navigation.navigate("Settings")}
          style={[styles.linkRow, { borderColor: theme.colors.border }]}
        >
          <Ionicons
            name="settings-outline"
            size={22}
            color={theme.colors.accent}
          />
          <View style={styles.linkTextWrap}>
            <Text style={[styles.linkTitle, { color: theme.colors.fg }]}>
              {t("profile.settings")}
            </Text>
            <Text style={[styles.linkSubtitle, { color: theme.colors.muted }]}>
              {t("profile.settingsSubtitle")}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.colors.muted}
          />
        </Pressable>

        <View style={styles.spacer} />

        <Button onPress={onSignOut} variant="ghost">
          {t("profile.signOut")}
        </Button>

        <View style={{ height: theme.spacing.md }} />

        <Button onPress={onDeleteAccount} variant="destructive">
          {t("profile.deleteAccount")}
        </Button>

        <View style={{ height: theme.spacing.xl * 2 }} />
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      paddingTop: theme.spacing.md,
    },
    title: {
      fontSize: theme.typography.title,
      fontWeight: "800",
    },
    subtitle: {
      fontSize: theme.typography.small,
      marginTop: theme.spacing.xs / 2,
    },
    card: {
      marginTop: theme.spacing.md,
      borderWidth: 1,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    sectionLabel: {
      fontSize: theme.typography.xs,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    readOnlyValue: {
      fontSize: theme.typography.body,
      fontWeight: "600",
    },
    helper: {
      fontSize: theme.typography.small,
    },
    divider: {
      height: 1,
      marginVertical: theme.spacing.sm,
    },
    spacer: {
      height: theme.spacing.lg,
    },
    linkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      borderWidth: 1,
      borderRadius: theme.radius.md,
    },
    linkTextWrap: {
      flex: 1,
    },
    linkTitle: {
      fontSize: theme.typography.body,
      fontWeight: "800",
    },
    linkSubtitle: {
      fontSize: theme.typography.xs,
      marginTop: theme.spacing.xs / 4,
    },
  });
