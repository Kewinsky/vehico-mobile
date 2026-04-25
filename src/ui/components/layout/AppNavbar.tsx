import type { ReactNode } from "react";
import { useLayoutEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { HeaderButton } from "@react-navigation/elements";
import {
  ChevronLeft,
  Crown,
  Plus,
  RefreshCcw,
  Settings,
  SlidersHorizontal,
} from "lucide-react-native";

import { useTheme } from "../../ThemeProvider";
import { useAuth } from "../../../app/providers/AuthProvider";
import type { AppStackParamList } from "../../../app/navigation/RootNavigator";

export type HeaderAction =
  | {
      type: "filter";
      onPress: () => void;
      hasActive?: boolean;
    }
  | {
      type: "filterReset";
      onPress: () => void;
    }
  | {
      type: "add";
      onPress: () => void;
    };

export type AppNavbarProps = {
  onBack?: () => void;
  right?: ReactNode;
  title?: string;
  showProfileAvatar?: boolean;
  showShopIcon?: boolean;
  /** Common header actions (filter, add, etc.) rendered on the right side. */
  actions?: HeaderAction[];
};

export function useNativeHeaderAsAppNavbar({
  onBack,
  right,
  title,
  showProfileAvatar,
  showShopIcon,
  actions,
}: AppNavbarProps) {
  const { theme } = useTheme();
  const headerIconSize = 20;
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
  const actionsContent = useMemo(() => {
    if (!actions || actions.length === 0) return null;
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
        }}
      >
        {actions.map((action, index) => {
          if (action.type === "filter") {
            return (
              <HeaderButton
                key={`action-filter-${index}`}
                onPress={action.onPress}
                tintColor={theme.colors.accent}
                accessibilityLabel="Filter"
              >
                <SlidersHorizontal
                  size={headerIconSize}
                  color={theme.colors.accent}
                />
              </HeaderButton>
            );
          }
          if (action.type === "filterReset") {
            return (
              <HeaderButton
                key={`action-filter-reset-${index}`}
                onPress={action.onPress}
                tintColor={theme.colors.accent}
                accessibilityLabel="Reset filters"
              >
                <RefreshCcw
                  size={headerIconSize}
                  color={theme.colors.accent}
                />
              </HeaderButton>
            );
          }
          if (action.type === "add") {
            return (
              <HeaderButton
                key={`action-add-${index}`}
                onPress={action.onPress}
                tintColor={theme.colors.accent}
                accessibilityLabel="Add"
              >
                <Plus size={headerIconSize} color={theme.colors.accent} />
              </HeaderButton>
            );
          }
          return null;
        })}
      </View>
    );
  }, [actions, headerIconSize, theme.colors.accent, theme.spacing.sm]);

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
          <Crown size={headerIconSize} color={theme.colors.accent} />
        </HeaderButton>
        {showProfileAvatar && user && (
          <HeaderButton
            onPress={() => navigation.navigate("Settings")}
            tintColor={theme.colors.accent}
            accessibilityLabel="Settings"
          >
            <Settings size={headerIconSize} color={theme.colors.accent} />
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
        <Settings size={headerIconSize} color={theme.colors.accent} />
      </HeaderButton>
    ) : null;

    const combinedRight =
      rightContent || actionsContent ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
          }}
        >
          {rightContent}
          {actionsContent}
        </View>
      ) : null;

    navigation.setOptions({
      headerTitle: title ?? "",
      headerBackVisible: false,
      headerTransparent: true,
      headerLeft: onBack
        ? () => (
            <HeaderButton
              onPress={onBack}
              tintColor={theme.colors.accent}
              accessibilityLabel={undefined}
            >
              <ChevronLeft size={headerIconSize} color={theme.colors.accent} />
            </HeaderButton>
          )
        : undefined,
      headerRight: combinedRight ? () => combinedRight : undefined,
      headerStyle: {
        backgroundColor: "transparent",
      },
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
    onBack,
    right,
    title,
    showProfileAvatar,
    showShopIcon,
    user,
    showInitials,
    hideProfileAvatar,
    actionsContent,
  ]);
}

export function AppNavbar({
  onBack,
  right,
  title,
  showProfileAvatar,
  showShopIcon,
  actions,
}: AppNavbarProps) {
  const { theme } = useTheme();
  const headerIconSize = 20;
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

  const actionsContent = useMemo(() => {
    if (!actions || actions.length === 0) return null;
    return (
      <View style={styles.rightIcons}>
        {actions.map((action, index) => {
          if (action.type === "filter") {
            return (
              <HeaderButton
                key={`action-filter-${index}`}
                onPress={action.onPress}
                tintColor={theme.colors.accent}
                accessibilityLabel="Filter"
              >
                <SlidersHorizontal
                  size={headerIconSize}
                  color={theme.colors.accent}
                />
              </HeaderButton>
            );
          }
          if (action.type === "filterReset") {
            return (
              <HeaderButton
                key={`action-filter-reset-${index}`}
                onPress={action.onPress}
                tintColor={theme.colors.accent}
                accessibilityLabel="Reset filters"
              >
                <RefreshCcw
                  size={headerIconSize}
                  color={theme.colors.accent}
                />
              </HeaderButton>
            );
          }
          if (action.type === "add") {
            return (
              <HeaderButton
                key={`action-add-${index}`}
                onPress={action.onPress}
                tintColor={theme.colors.accent}
                accessibilityLabel="Add"
              >
                <Plus size={headerIconSize} color={theme.colors.accent} />
              </HeaderButton>
            );
          }
          return null;
        })}
      </View>
    );
  }, [actions, headerIconSize, styles.rightIcons, theme.colors.accent]);

  return (
    <View style={styles.root}>
      <View style={styles.left}>
        {onBack ? (
          <HeaderButton
            onPress={onBack}
            tintColor={theme.colors.accent}
            accessibilityLabel={undefined}
          >
            <ChevronLeft size={headerIconSize} color={theme.colors.accent} />
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
              <Crown
                size={headerIconSize}
                color={theme.colors.accent}
              />
            </HeaderButton>
            {showProfileAvatar && user && (
              <HeaderButton
                onPress={() => navigation.navigate("Settings")}
                tintColor={theme.colors.accent}
                accessibilityLabel="Settings"
              >
                <Settings size={headerIconSize} color={theme.colors.accent} />
              </HeaderButton>
            )}
            {right}
            {actionsContent}
          </View>
        ) : right !== undefined || actionsContent ? (
          <View style={styles.rightIcons}>
            {right}
            {actionsContent}
          </View>
        ) : showInitials ? (
          <HeaderButton
            onPress={() => navigation.navigate("Settings")}
            tintColor={theme.colors.accent}
            accessibilityLabel="Settings"
          >
            <Settings size={headerIconSize} color={theme.colors.accent} />
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
