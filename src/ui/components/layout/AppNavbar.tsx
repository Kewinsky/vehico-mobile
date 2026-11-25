import type { ReactNode } from "react";
import { useLayoutEffect, useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation, useRoute } from "@react-navigation/native";
import type {
  NativeStackHeaderItem,
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";
import type { SFSymbol } from "sf-symbols-typescript";
import { nativeHeaderButton } from "./nativeHeaderItems";
import { HeaderIconButton } from "./HeaderIconButton";
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
  /** When set with `onBack`, replaces the default chevron in the native header. */
  backIcon?: ReactNode;
  backSystemImage?: SFSymbol;
  /** Preserve a custom back handler instead of popping the native stack. */
  backBehavior?: "native" | "custom";
  right?: ReactNode;
  nativeRightItems?: NativeStackHeaderItem[];
  title?: string;
  largeTitle?: boolean;
  showProfileAvatar?: boolean;
  showShopIcon?: boolean;
  /** Common header actions (filter, add, etc.) rendered on the right side. */
  actions?: HeaderAction[];
};

export function useNativeHeaderAsAppNavbar({
  onBack,
  backIcon,
  backSystemImage,
  backBehavior = "native",
  right,
  nativeRightItems,
  title,
  largeTitle = false,
  showProfileAvatar,
  showShopIcon,
  actions,
}: AppNavbarProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
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
              <HeaderIconButton
                key={`action-filter-${index}`}
                onPress={action.onPress}
                tintColor={theme.colors.accent}
                accessibilityLabel="Filter"
              >
                <SlidersHorizontal
                  size={headerIconSize}
                  color={theme.colors.accent}
                />
              </HeaderIconButton>
            );
          }
          if (action.type === "filterReset") {
            return (
              <HeaderIconButton
                key={`action-filter-reset-${index}`}
                onPress={action.onPress}
                tintColor={theme.colors.accent}
                accessibilityLabel="Reset filters"
              >
                <RefreshCcw size={headerIconSize} color={theme.colors.accent} />
              </HeaderIconButton>
            );
          }
          if (action.type === "add") {
            return (
              <HeaderIconButton
                key={`action-add-${index}`}
                onPress={action.onPress}
                tintColor={theme.colors.accent}
                accessibilityLabel="Add"
              >
                <Plus size={headerIconSize} color={theme.colors.accent} />
              </HeaderIconButton>
            );
          }
          return null;
        })}
      </View>
    );
  }, [actions, headerIconSize, theme.colors.accent, theme.spacing.sm]);

  useLayoutEffect(() => {
    if (Platform.OS === "ios") {
      const items: NativeStackHeaderItem[] = [];
      if (showShopIcon) {
        items.push(
          nativeHeaderButton(t("shop.title"), "crown", () => navigation.navigate("Shop")),
        );
        if (showProfileAvatar && user) {
          items.push(
            nativeHeaderButton(t("common.settings"), "gearshape", () => navigation.navigate("Settings")),
          );
        }
      }
      if (nativeRightItems !== undefined) {
        items.push(...nativeRightItems);
      } else if (right != null) {
        items.push({ type: "custom", element: <>{right}</> });
      } else if (!showShopIcon && showInitials) {
        items.push(
          nativeHeaderButton(t("common.settings"), "gearshape", () => navigation.navigate("Settings")),
        );
      }
      for (const action of actions ?? []) {
        if (action.type === "add") {
          items.push(nativeHeaderButton(t("common.add"), "plus", action.onPress));
        } else if (action.type === "filterReset") {
          items.push(
            nativeHeaderButton(t("common.resetFilters"), "arrow.counterclockwise", action.onPress),
          );
        } else {
          items.push(
            nativeHeaderButton(t("common.filter"), "line.3.horizontal.decrease", action.onPress),
          );
        }
      }

      const systemBack =
        !!onBack &&
        !backSystemImage &&
        backBehavior === "native" &&
        navigation.canGoBack();
      const leftItems: NativeStackHeaderItem[] = [];
      if (onBack && !systemBack) {
        leftItems.push(
          nativeHeaderButton(
            backSystemImage ? t("vehicles.title") : t("common.back"),
            backSystemImage ?? "chevron.left",
            onBack,
          ),
        );
      }

      navigation.setOptions({
        headerTitle: title ?? "",
        headerLargeTitleEnabled: largeTitle,
        headerLargeTitleStyle: { color: theme.colors.fg },
        headerBackVisible: systemBack,
        headerBackButtonDisplayMode: "minimal",
        headerTintColor: theme.colors.accent,
        headerTransparent: true,
        headerLeft: undefined,
        headerRight: undefined,
        unstable_headerLeftItems: systemBack ? undefined : () => leftItems,
        unstable_headerRightItems: () =>
          items.map((item) => {
            if (item.type === "button" || item.type === "menu") {
              return { ...item, tintColor: item.tintColor ?? theme.colors.accent };
            }
            return item;
          }),
        headerStyle: { backgroundColor: "transparent" },
        headerTitleStyle: {
          color: theme.colors.fg,
          fontWeight: theme.typography.fontWeight.bold,
          fontSize: theme.typography.title,
        },
        headerShadowVisible: false,
      });
      return;
    }

    const rightContent = showShopIcon ? (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
        }}
      >
        <HeaderIconButton
          onPress={() => navigation.navigate("Shop")}
          tintColor={theme.colors.accent}
          accessibilityLabel="Shop"
        >
          <Crown size={headerIconSize} color={theme.colors.accent} />
        </HeaderIconButton>
        {showProfileAvatar && user && (
          <HeaderIconButton
            onPress={() => navigation.navigate("Settings")}
            tintColor={theme.colors.accent}
            accessibilityLabel="Settings"
          >
            <Settings size={headerIconSize} color={theme.colors.accent} />
          </HeaderIconButton>
        )}
        {right}
      </View>
    ) : right !== undefined ? (
      right
    ) : showInitials ? (
      <HeaderIconButton
        onPress={() => navigation.navigate("Settings")}
        tintColor={theme.colors.accent}
        accessibilityLabel="Settings"
      >
        <Settings size={headerIconSize} color={theme.colors.accent} />
      </HeaderIconButton>
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
            <HeaderIconButton
              onPress={onBack}
              tintColor={theme.colors.accent}
              accessibilityLabel={undefined}
            >
              {backIcon ?? (
                <ChevronLeft
                  size={headerIconSize}
                  color={theme.colors.accent}
                />
              )}
            </HeaderIconButton>
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
    backIcon,
    right,
    title,
    largeTitle,
    showProfileAvatar,
    showShopIcon,
    user,
    showInitials,
    hideProfileAvatar,
    actionsContent,
    actions,
    backBehavior,
    backSystemImage,
    nativeRightItems,
    t,
  ]);
}

export function AppNavbar({
  onBack,
  backIcon,
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
              <HeaderIconButton
                key={`action-filter-${index}`}
                onPress={action.onPress}
                tintColor={theme.colors.accent}
                accessibilityLabel="Filter"
              >
                <SlidersHorizontal
                  size={headerIconSize}
                  color={theme.colors.accent}
                />
              </HeaderIconButton>
            );
          }
          if (action.type === "filterReset") {
            return (
              <HeaderIconButton
                key={`action-filter-reset-${index}`}
                onPress={action.onPress}
                tintColor={theme.colors.accent}
                accessibilityLabel="Reset filters"
              >
                <RefreshCcw size={headerIconSize} color={theme.colors.accent} />
              </HeaderIconButton>
            );
          }
          if (action.type === "add") {
            return (
              <HeaderIconButton
                key={`action-add-${index}`}
                onPress={action.onPress}
                tintColor={theme.colors.accent}
                accessibilityLabel="Add"
              >
                <Plus size={headerIconSize} color={theme.colors.accent} />
              </HeaderIconButton>
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
          <HeaderIconButton
            onPress={onBack}
            tintColor={theme.colors.accent}
            accessibilityLabel={undefined}
          >
            {backIcon ?? (
              <ChevronLeft size={headerIconSize} color={theme.colors.accent} />
            )}
          </HeaderIconButton>
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
            <HeaderIconButton
              onPress={() => navigation.navigate("Shop")}
              tintColor={theme.colors.accent}
              accessibilityLabel="Shop"
            >
              <Crown size={headerIconSize} color={theme.colors.accent} />
            </HeaderIconButton>
            {showProfileAvatar && user && (
              <HeaderIconButton
                onPress={() => navigation.navigate("Settings")}
                tintColor={theme.colors.accent}
                accessibilityLabel="Settings"
              >
                <Settings size={headerIconSize} color={theme.colors.accent} />
              </HeaderIconButton>
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
          <HeaderIconButton
            onPress={() => navigation.navigate("Settings")}
            tintColor={theme.colors.accent}
            accessibilityLabel="Settings"
          >
            <Settings size={headerIconSize} color={theme.colors.accent} />
          </HeaderIconButton>
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
