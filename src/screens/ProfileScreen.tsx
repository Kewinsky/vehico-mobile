import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { useAuth } from "../app/providers/AuthProvider";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { Screen } from "../ui/components/Screen";
import { TextField } from "../ui/components/TextField";
import { useTheme } from "../ui/ThemeProvider";
import { toastError, toastSuccess } from "../ui/toast/toast";
import { supabase } from "../services/supabase/client";
import { deleteAccount } from "../services/account/deleteAccount";

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
  const [deleting, setDeleting] = useState(false);

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

  async function performDeleteAccount() {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteAccount();
      toastSuccess(t("profile.deleteAccountSuccess"));
      await signOut();
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setDeleting(false);
    }
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
          onPress: () => void performDeleteAccount(),
        },
      ]
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
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: theme.colors.fg }]}>
          {t("profile.title")}
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

        <Button
          onPress={onDeleteAccount}
          variant="destructive"
          disabled={deleting}
          style={styles.deleteButton}
        >
          {deleting ? t("common.loading") : t("profile.deleteAccount")}
        </Button>

        <View style={styles.bottomSpacer} />

        <View style={styles.bottomActions}>
          <View style={styles.bottomActionCol}>
            <Button
              variant="outlined"
              onPress={() => navigation.navigate("Settings")}
            >
              {t("profile.settings")}
            </Button>
          </View>
          <View style={styles.bottomActionCol}>
            <Button variant="primary" onPress={onSignOut}>
              {t("profile.signOut")}
            </Button>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      paddingBottom: theme.spacing.xl,
    },
    title: {
      fontSize: theme.typography.largeTitle,
      fontWeight: "700",
      marginVertical: theme.spacing.md,
    },
    card: {
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
    deleteButton: {
      marginTop: theme.spacing.md,
    },
    bottomSpacer: {
      flex: 1,
      minHeight: theme.spacing.xl * 2,
    },
    bottomActions: {
      marginTop: theme.spacing.md,
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    bottomActionCol: {
      flex: 1,
    },
  });
