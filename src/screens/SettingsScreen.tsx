import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { useAuth } from "../app/providers/AuthProvider";
import { AppHeader } from "../ui/components/AppHeader";
import { Button } from "../ui/components/Button";
import { Screen } from "../ui/components/Screen";
import { useTheme } from "../ui/ThemeProvider";
import { toastError, toastSuccess } from "../ui/toast/toast";
import { supabase } from "../services/supabase/client";

type Props = NativeStackScreenProps<AppStackParamList, "Settings">;

function getInitials(user: {
  user_metadata?: { full_name?: string };
  email?: string | null;
}): string {
  const name = user?.user_metadata?.full_name?.trim();
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
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  onPress: () => void;
};

export function SettingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme, mode } = useTheme();
  const { user, signOut } = useAuth();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const displayNameFromUser =
    (user?.user_metadata?.full_name as string | undefined)?.trim() || "";
  const email = user?.email ?? "";
  const displayLabel = displayNameFromUser || email || "—";

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(displayNameFromUser);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEditingName) setEditName(displayNameFromUser);
  }, [displayNameFromUser, isEditingName]);

  const saveDisplayName = useCallback(async () => {
    const trimmed = editName.trim();
    if (trimmed === displayNameFromUser) {
      setIsEditingName(false);
      return;
    }
    try {
      setSaving(true);
      const { error } = await supabase.auth.updateUser({
        data: { full_name: trimmed || null },
      });
      if (error) throw error;
      toastSuccess(t("profile.displayNameUpdated"));
      setIsEditingName(false);
    } catch (e: any) {
      toastError(e?.message ?? t("common.error"));
    } finally {
      setSaving(false);
    }
  }, [editName, displayNameFromUser, t]);

  function openEditNameModal() {
    setEditName(displayNameFromUser);
    setIsEditingName(true);
  }

  function closeEditNameModal() {
    if (!saving) setIsEditingName(false);
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
    () => [
      {
        id: "appearance",
        icon: "options-outline",
        title: t("settings.appearanceButton"),
        subtitle: t("settings.appearanceSubtitle"),
        onPress: () => navigation.navigate("Appearance"),
      },
      {
        id: "shop",
        icon: "cart-outline",
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
    [t, navigation],
  );

  return (
    <Screen padding={false}>
      <AppHeader onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingHorizontal: theme.layout.contentPaddingHorizontal },
        ]}
      >
        <Text style={[styles.largeTitle, { color: theme.colors.fg }]}>
          {t("settings.title")}
        </Text>
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
            onPress={openEditNameModal}
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

        <Modal
          visible={isEditingName}
          transparent
          animationType="fade"
          onRequestClose={closeEditNameModal}
        >
          <Pressable
            style={[
              styles.modalOverlay,
              { backgroundColor: theme.colors.bg + "E6" },
            ]}
            onPress={closeEditNameModal}
          >
            <Pressable
              style={[
                styles.modalContent,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <SafeAreaView edges={[]} style={styles.modalSafe}>
                <Text style={[styles.modalTitle, { color: theme.colors.fg }]}>
                  {t("profile.displayName")}
                </Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder={t("profile.displayNamePlaceholder")}
                  placeholderTextColor={theme.colors.muted}
                  keyboardAppearance={mode === "dark" ? "dark" : "light"}
                  style={[
                    styles.modalInput,
                    {
                      color: theme.colors.fg,
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.bg,
                    },
                  ]}
                  autoFocus
                  editable={!saving}
                />
                <View style={styles.modalActions}>
                  <Button
                    variant="outlined"
                    onPress={closeEditNameModal}
                    disabled={saving}
                    style={[styles.modalButton, styles.modalButtonCol]}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    variant="primary"
                    onPress={saveDisplayName}
                    disabled={saving}
                    style={[styles.modalButton, styles.modalButtonCol]}
                  >
                    {saving ? t("common.loading") : t("common.save")}
                  </Button>
                </View>
              </SafeAreaView>
            </Pressable>
          </Pressable>
        </Modal>

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
              <Ionicons
                name={row.icon}
                size={22}
                color={theme.colors.accent}
                style={styles.rowIcon}
              />
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
    </Screen>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      paddingBottom: theme.spacing.xl,
    },
    largeTitle: {
      fontSize: theme.typography.largeTitle,
      fontWeight: "700",
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
      fontWeight: "800",
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    displayName: {
      fontSize: theme.typography.body,
      fontWeight: "600",
    },
    pencilIcon: {
      marginLeft: 2,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.lg,
    },
    modalContent: {
      width: "100%",
      maxWidth: 340,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      padding: theme.spacing.lg,
      overflow: "hidden",
    },
    modalSafe: {
      width: "100%",
    },
    modalTitle: {
      fontSize: theme.typography.body,
      fontWeight: "600",
      marginBottom: theme.spacing.sm,
    },
    modalInput: {
      height: 44,
      borderWidth: 1,
      borderRadius: theme.radius.sm,
      paddingHorizontal: theme.spacing.sm,
      fontSize: theme.typography.body,
      marginBottom: theme.spacing.md,
    },
    modalActions: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      flexWrap: "nowrap",
    },
    modalButton: {
      minWidth: 0,
    },
    modalButtonCol: {
      flex: 1,
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
      fontWeight: "600",
    },
    rowSubtitle: {
      fontSize: theme.typography.small,
      marginTop: 2,
    },
    bottomSpacer: {
      height: theme.spacing.lg,
    },
  });
