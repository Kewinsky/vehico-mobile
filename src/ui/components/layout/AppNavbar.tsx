import type { ReactNode } from "react";
import { useLayoutEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { HeaderButton } from "@react-navigation/elements";
import { Crown } from "lucide-react-native";

import { useTheme } from "../../ThemeProvider";
import { useAuth } from "../../../app/providers/AuthProvider";
import type { AppStackParamList } from "../../../app/navigation/RootNavigator";

export type AppNavbarProps = {
  onBack?: () => void;
  right?: ReactNode;
  title?: string;
  showProfileAvatar?: boolean;
  showShopIcon?: boolean;
};

export function useNativeHeaderAsAppNavbar({
  onBack,
  right,
  title,
  showProfileAvatar,
  showShopIcon,
}: AppNavbarProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const route = useRoute();
  const navigation =
    useNavigation<
      NativeStackNavigationProp<AppStackParamList, keyof AppStackParamList>
    >();

  const hideProfileAvatar =
    route.name === "Settings" ||
    route.name === "Appearance" ||
    route.name === "Shop";
  const showInitials =
    !!user &&
    right === undefined &&
    !hideProfileAvatar &&
    !showShopIcon &&
    showProfileAvatar;

  useLayoutEffect(() => {
    const rightContent = showShopIcon ? (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
        }}
      >
        <HeaderButton
          onPress={() => navigation.navigate("Shop")}
          tintColor={theme.colors.accent}
          accessibilityLabel="Shop"
        >
          <Crown size={theme.icons.headerButton} color={theme.colors.accent} />
        </HeaderButton>
          {showProfileAvatar && user && (
            <HeaderButton
              onPress={() => navigation.navigate("Settings")}
              tintColor={theme.colors.accent}
              accessibilityLabel="Settings"
            >
              <Ionicons
                name="settings-outline"
                size={theme.icons.headerButton}
                color={theme.colors.accent}
              />
            </HeaderButton>
          )}
          {right}
        </View>
      ) : right !== undefined ? (
        right
      ) : showInitials ? (
        <HeaderButton
          onPress={() => navigation.navigate("Settings")}
          tintColor={theme.colors.accent}
          accessibilityLabel="Settings"
        >
          <Ionicons
            name="settings-outline"
            size={theme.icons.headerButton}
            color={theme.colors.accent}
          />
        </HeaderButton>
      ) : null;

    navigation.setOptions({
      headerTitle: title ?? "",
      headerBackVisible: false,
      headerLeft: onBack
        ? () => (
            <HeaderButton
              onPress={onBack}
              tintColor={theme.colors.accent}
              accessibilityLabel={undefined}
            >
              <Ionicons
                name="chevron-back"
                size={theme.icons.headerButton}
                color={theme.colors.accent}
              />
            </HeaderButton>
          )
        : undefined,
      headerRight: rightContent ? () => rightContent : undefined,
      headerStyle: { backgroundColor: theme.colors.bg },
      headerTitleStyle: {
        color: theme.colors.fg,
        fontWeight: theme.typography.fontWeight.bold,
        fontSize: theme.typography.title,
      },
      headerShadowVisible: false,
    });
  }, [
    navigation,
    theme.colors.bg,
    theme.colors.fg,
    theme.colors.accent,
    theme.spacing.sm,
    theme.typography.fontWeight.bold,
    theme.typography.title,
    theme.icons.headerButton,
    onBack,
    right,
    title,
    showProfileAvatar,
    showShopIcon,
    user,
    showInitials,
    hideProfileAvatar,
  ]);
}

export function AppNavbar({
  onBack,
  right,
  title,
  showProfileAvatar,
  showShopIcon,
}: AppNavbarProps) {
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
    route.name === "Shop";
  const showInitials =
    !!user &&
    right === undefined &&
    !hideProfileAvatar &&
    !showShopIcon &&
    showProfileAvatar;

  return (
    <View style={styles.root}>
      <View style={styles.left}>
        {onBack ? (
          <HeaderButton
            onPress={onBack}
            tintColor={theme.colors.accent}
            accessibilityLabel={undefined}
          >
            <Ionicons
              name="chevron-back"
              size={theme.icons.headerButton}
              color={theme.colors.accent}
            />
          </HeaderButton>
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
        {showShopIcon ? (
          <View style={styles.rightIcons}>
            <HeaderButton
              onPress={() => navigation.navigate("Shop")}
              tintColor={theme.colors.accent}
              accessibilityLabel="Shop"
            >
              <Crown size={theme.icons.headerButton} color={theme.colors.accent} />
            </HeaderButton>
            {showProfileAvatar && user && (
              <HeaderButton
                onPress={() => navigation.navigate("Settings")}
                tintColor={theme.colors.accent}
                accessibilityLabel="Settings"
              >
                <Ionicons
                  name="settings-outline"
                  size={22}
                  color={theme.colors.accent}
                />
              </HeaderButton>
            )}
            {right}
          </View>
        ) : right !== undefined ? (
          right
        ) : showInitials ? (
          <HeaderButton
            onPress={() => navigation.navigate("Settings")}
            tintColor={theme.colors.accent}
            accessibilityLabel="Settings"
          >
            <Ionicons
              name="settings-outline"
              size={22}
              color={theme.colors.accent}
            />
          </HeaderButton>
        ) : null}
      </View>
    </View>
  );
}

const makeStyles = (theme: any) =>
  StyleSheet.create({
    root: {
      height: theme.spacing.lg * 2 + theme.spacing.sm,
      paddingHorizontal: theme.layout.contentPaddingHorizontal,
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
    title: {
      flex: 1,
      color: theme.colors.fg,
      fontWeight: theme.typography.fontWeight.bold,
      fontSize: theme.typography.title,
      textAlign: "left",
    },
    titleWithBack: {
      marginLeft: theme.spacing.xs,
    },
  });
