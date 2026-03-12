import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Linking from "expo-linking";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Crown } from "lucide-react-native";

import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { useAuth } from "../../app/providers/AuthProvider";
import { normalizeDisplayName } from "../../utils/displayName";
import { ModalLayout } from "../../layouts";
import { useTheme } from "../../ui/ThemeProvider";
import { toastError, toastSuccess } from "../../ui/toast/toast";
import { supabase } from "../../services/supabase/client";

type Props = NativeStackScreenProps<AppStackParamList, "Settings">;

function getInitials(user: {
  user_metadata?: { full_name?: string };
  email?: string | null;
}): string {
  const name = normalizeDisplayName(user?.user_metadata?.full_name);
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0])
        .toUpperCase()
        .slice(0, 2);
    }
    return name.slice(0, 2).toUpperCase();
  }
  const email = user?.email ?? "";
  return email.slice(0, 2).toUpperCase() || "??";
}

type RowItem = {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>["name"] | React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
};

export function SettingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user, signOut } = useAuth();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const displayNameFromUser = normalizeDisplayName(
    user?.user_metadata?.full_name as string | undefined,
  );
  const email = user?.email ?? "";
  const displayLabel = displayNameFromUser || email || "—";

  const [saving, setSaving] = useState(false);

  const saveDisplayNameFromPrompt = useCallback(
    async (nextName?: string) => {
      const trimmed = (nextName ?? "").trim();
      const normalized = normalizeDisplayName(trimmed || undefined);
      if (normalized === displayNameFromUser) {
        return;
      }
      try {
        setSaving(true);
        const { error } = await supabase.auth.updateUser({
          data: { full_name: normalized || null },
        });
        if (error) throw error;
        toastSuccess(t("profile.displayNameUpdated"));
      } catch (e: any) {
        toastError(e?.message ?? t("common.error"));
      } finally {
        setSaving(false);
      }
    },
    [displayNameFromUser, t],
  );

  function openEditNamePrompt() {
    if (saving) return;
    Alert.prompt(
      t("profile.displayName"),
      t("profile.displayNamePlaceholder"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.save"),
          onPress: (value: string | undefined) => {
            void saveDisplayNameFromPrompt(value);
          },
        },
      ],
      "plain-text",
      displayNameFromUser,
    );
  }

  function onSignOut() {
    signOut().catch((e: any) => {
      toastError(e?.message ?? t("common.error"));
    });
  }

  async function onSupport() {
    const url = "mailto:example@vehico.io?subject=Support%20request";
    try {
      await Linking.openURL(url);
    } catch {
      toastError(t("common.error"));
    }
  }

  const rows: RowItem[] = useMemo(
    (): RowItem[] => [
      {
        id: "appearance",
        icon: "options-outline",
        title: t("settings.appearanceButton"),
        subtitle: t("settings.appearanceSubtitle"),
        onPress: () => navigation.navigate("Appearance"),
      },
      {
        id: "shop",
        icon: <Crown size={22} color={theme.colors.accent} />,
        title: t("settings.shopButton"),
        subtitle: t("settings.shopSubtitle"),
        onPress: () => navigation.navigate("Shop"),
      },
      {
        id: "support",
        icon: "help-circle-outline",
        title: t("settings.supportTitle"),
        subtitle: t("settings.supportSubtitle"),
        onPress: onSupport,
      },
      {
        id: "signout",
        icon: "log-out-outline",
        title: t("profile.signOut"),
        subtitle: t("settings.signOutSubtitle"),
        onPress: onSignOut,
      },
    ],
    [t, navigation, theme.colors.accent],
  );

  return (
    <ModalLayout
      title={t("settings.title")}
      cancel={{
        onPress: () => navigation.goBack(),
        label: t("common.cancel"),
      }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.avatarBlock}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: theme.colors.accent + "30" },
            ]}
          >
            <Text
              style={[styles.avatarText, { color: theme.colors.accent }]}
              numberOfLines={1}
            >
              {user ? getInitials(user) : "??"}
            </Text>
          </View>

          <Pressable
            onPress={openEditNamePrompt}
            disabled={saving}
            style={styles.nameRow}
            hitSlop={8}
          >
            <Text
              style={[styles.displayName, { color: theme.colors.fg }]}
              numberOfLines={1}
            >
              {displayLabel}
            </Text>
            <Ionicons
              name="create-outline"
              size={18}
              color={theme.colors.accent}
              style={styles.pencilIcon}
            />
          </Pressable>
        </View>

        <View
          style={[
            styles.list,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {rows.map((row, index) => (
            <Pressable
              key={row.id}
              onPress={row.onPress}
              style={({ pressed }) => [
                styles.row,
                index < rows.length - 1 && styles.rowBorder,
                { borderColor: theme.colors.border },
                pressed && styles.rowPressed,
              ]}
            >
              {typeof row.icon === "string" ? (
                <Ionicons
                  name={
                    row.icon as React.ComponentProps<typeof Ionicons>["name"]
                  }
                  size={22}
                  color={theme.colors.accent}
                  style={styles.rowIcon}
                />
              ) : (
                <View style={styles.rowIcon}>{row.icon}</View>
              )}
              <View style={styles.rowText}>
                <Text
                  style={[styles.rowTitle, { color: theme.colors.fg }]}
                  numberOfLines={1}
                >
                  {row.title}
                </Text>
                <Text
                  style={[styles.rowSubtitle, { color: theme.colors.muted }]}
                  numberOfLines={1}
                >
                  {row.subtitle}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.accent}
              />
            </Pressable>
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ModalLayout>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    largeTitle: {
      fontSize: theme.typography.largeTitle,
      fontWeight: theme.typography.fontWeight.bold,
      marginVertical: theme.spacing.md,
    },
    avatarBlock: {
      alignItems: "center",
      marginBottom: theme.spacing.xl,
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: theme.typography.title,
      fontWeight: theme.typography.fontWeight.bold,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    displayName: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    pencilIcon: {
      marginLeft: 2,
    },
    list: {
      borderRadius: theme.radius.md,
      borderWidth: 1,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    rowBorder: {
      borderBottomWidth: 1,
    },
    rowPressed: {
      opacity: 0.7,
    },
    rowIcon: {
      marginRight: theme.spacing.md,
    },
    rowText: {
      flex: 1,
      minWidth: 0,
    },
    rowTitle: {
      fontSize: theme.typography.body,
      fontWeight: theme.typography.fontWeight.bold,
    },
    rowSubtitle: {
      fontSize: theme.typography.small,
      marginTop: 2,
    },
    bottomSpacer: {
      height: theme.spacing.lg,
    },
  });
