import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useTheme } from "../ThemeProvider";
import { useAuth } from "../../app/providers/AuthProvider";
import type { AppStackParamList } from "../../app/navigation/RootNavigator";
import { normalizeDisplayName } from "../../utils/displayName";
import { Crown } from "lucide-react-native";

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

export function AppHeader({
  onBack,
  right,
  title,
  showShopIcon,
  onShopPress,
}: {
  onBack?: () => void;
  right?: ReactNode;
  title?: string;
  showShopIcon?: boolean;
  onShopPress?: () => void;
}) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const route = useRoute();
  const navigation =
    useNavigation<
      NativeStackNavigationProp<AppStackParamList, keyof AppStackParamList>
    >();
  const styles = makeStyles(theme);

  const hideProfileAvatar =
    route.name === "Settings" ||
    route.name === "Appearance" ||
    route.name === "Shop" ||
    route.name === "TermsOfUse" ||
    route.name === "PrivacyPolicy";
  const showInitials =
    !!user && right === undefined && !hideProfileAvatar && !showShopIcon;
  const initials = user ? getInitials(user) : "";

  return (
    <View style={styles.root}>
      <View style={styles.left}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={10}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={theme.colors.accent}
            />
          </Pressable>
        ) : null}
      </View>
      {title ? (
        <Text
          style={[styles.title, onBack ? styles.titleWithBack : undefined]}
          numberOfLines={2}
        >
          {title}
        </Text>
      ) : (
        <View style={styles.titleSpacer} />
      )}
      <View style={styles.right}>
        {showShopIcon && onShopPress ? (
          <View style={styles.rightIcons}>
            <Pressable
              onPress={onShopPress}
              hitSlop={10}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.backButtonPressed,
              ]}
            >
              <Crown size={22} color={theme.colors.accent} />
            </Pressable>
            {user && (
              <Pressable
                onPress={() => navigation.navigate("Settings")}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.avatarButton,
                  { backgroundColor: theme.colors.accent + "30" },
                  pressed && styles.backButtonPressed,
                ]}
              >
                <Text
                  style={[styles.avatarText, { color: theme.colors.accent }]}
                  numberOfLines={1}
                >
                  {initials}
                </Text>
              </Pressable>
            )}
            {right}
          </View>
        ) : right !== undefined ? (
          right
        ) : showInitials ? (
          <Pressable
            onPress={() => navigation.navigate("Settings")}
            hitSlop={10}
            style={({ pressed }) => [
              styles.avatarButton,
              { backgroundColor: theme.colors.accent + "30" },
              pressed && styles.backButtonPressed,
            ]}
          >
            <Text
              style={[styles.avatarText, { color: theme.colors.accent }]}
              numberOfLines={1}
            >
              {initials}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    root: {
      height: theme.spacing.lg * 2 + theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.bg,
    },
    left: {
      alignItems: "flex-start",
      justifyContent: "center",
    },
    titleSpacer: {
      flex: 1,
      justifyContent: "center",
    },
    right: {
      marginLeft: "auto",
      minWidth: theme.spacing.lg * 2,
      alignItems: "flex-end",
      justifyContent: "center",
    },
    rightIcons: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    iconButton: {
      width: theme.spacing.xl + theme.spacing.xs,
      height: theme.spacing.xl + theme.spacing.xs,
      justifyContent: "center",
      alignItems: "center",
    },
    backButton: {
      width: theme.spacing.xl + theme.spacing.xs,
      height: theme.spacing.xl + theme.spacing.xs,
      justifyContent: "center",
    },
    backButtonPressed: {
      opacity: 0.6,
    },
    avatarButton: {
      width: theme.spacing.lg + theme.spacing.sm,
      height: theme.spacing.lg + theme.spacing.sm,
      borderRadius: 9999,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarText: {
      fontSize: theme.typography.small,
      fontWeight: "700",
    },
    title: {
      flex: 1,
      color: theme.colors.fg,
      fontWeight: "700",
      fontSize: theme.typography.title,
      textAlign: "left",
    },
    titleWithBack: {
      marginLeft: theme.spacing.xs,
    },
  });
