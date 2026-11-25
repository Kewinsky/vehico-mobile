import type { PropsWithChildren, ReactNode } from "react";
import { useLayoutEffect, useMemo } from "react";
import { Platform, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { nativeHeaderButton } from "../ui/components/layout/nativeHeaderItems";
import { useNavigation } from "@react-navigation/native";
import type {
  NativeStackHeaderItem,
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";
import { HeaderIconButton } from "../ui/components/layout/HeaderIconButton";
import { Crown, Settings } from "lucide-react-native";

import { AppLayout } from "../ui/components/layout/AppLayout";
import { useTheme } from "../ui/ThemeProvider";
import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { useAuth } from "../app/providers/AuthProvider";

export type WelcomeHeaderLayoutProps = PropsWithChildren<{
  title: string;
  largeTitle?: boolean;
  showProfileAvatar?: boolean;
  showShopIcon?: boolean;
  right?: ReactNode;
  loading?: boolean;
  ready?: boolean;
  minLoadingMs?: number;
  footer?: ReactNode;
  background?: ReactNode;
}>;

export function WelcomeHeaderLayout({
  children,
  title,
  largeTitle = false,
  showProfileAvatar = false,
  showShopIcon = false,
  right,
  loading = false,
  ready = true,
  minLoadingMs = 0,
  footer,
  background,
}: WelcomeHeaderLayoutProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigation =
    useNavigation<
      NativeStackNavigationProp<AppStackParamList, keyof AppStackParamList>
    >();

  const showSettingsIcon = showProfileAvatar && user;
  const rightContent = useMemo(
    () =>
      showShopIcon || showSettingsIcon || right !== undefined ? (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
        }}
      >
        {showShopIcon && (
          <HeaderIconButton
            onPress={() => navigation.navigate("Shop")}
            tintColor={theme.colors.accent}
            accessibilityLabel="Shop"
          >
            <Crown
              size={theme.icons.headerButton}
              color={theme.colors.accent}
            />
          </HeaderIconButton>
        )}
        {showSettingsIcon && (
          <HeaderIconButton
            onPress={() => navigation.navigate("Settings")}
            tintColor={theme.colors.accent}
            accessibilityLabel="Settings"
          >
            <Settings
              size={theme.icons.headerButton}
              color={theme.colors.accent}
            />
          </HeaderIconButton>
        )}
        {right}
      </View>
    ) : null,
    [
      navigation,
      right,
      showSettingsIcon,
      showShopIcon,
      theme.colors.accent,
      theme.icons.headerButton,
      theme.spacing.sm,
    ],
  );

  useLayoutEffect(() => {
    const nativeItems: NativeStackHeaderItem[] = [];
    if (showShopIcon) {
      nativeItems.push(nativeHeaderButton(t("shop.title"), "crown", () => navigation.navigate("Shop")));
    }
    if (showSettingsIcon) {
      nativeItems.push(nativeHeaderButton(t("common.settings"), "gearshape", () => navigation.navigate("Settings")));
    }
    if (right != null) {
      nativeItems.push({ type: "custom", element: <>{right}</> });
    }
    navigation.setOptions({
      headerTitle: Platform.OS === "ios" && largeTitle ? title : () => (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "flex-start",
          }}
        >
          <Text
            numberOfLines={2}
            style={{
              color: theme.colors.fg,
              fontWeight: theme.typography.fontWeight.bold,
              fontSize: theme.typography.title,
            }}
          >
            {title || ""}
          </Text>
        </View>
      ),
      headerTitleAlign: "left",
      headerLargeTitleEnabled: Platform.OS === "ios" && largeTitle,
      headerLargeTitleStyle: { color: theme.colors.fg },
      headerBackVisible: false,
      headerTransparent: true,
      headerRight: rightContent ? () => rightContent : undefined,
      ...(Platform.OS === "ios" ? {
        headerRight: undefined,
        unstable_headerRightItems: () => nativeItems.map((item) => {
          if (item.type === "button") return { ...item, tintColor: theme.colors.accent };
          return item;
        }),
      } : {}),
      headerStyle: {
        backgroundColor: "transparent",
      },
      headerShadowVisible: false,
    });
  }, [
    navigation,
    title,
    largeTitle,
    rightContent,
    theme.colors.bg,
    theme.colors.fg,
    theme.typography.fontWeight.bold,
    theme.typography.title,
    theme.icons.headerButton,
    showShopIcon,
    showProfileAvatar,
    user,
    right,
    theme.colors.accent,
    theme.spacing.sm,
    showSettingsIcon,
    t,
  ]);

  return (
    <AppLayout
      loading={loading}
      ready={ready}
      minLoadingMs={minLoadingMs}
      useNativeHeader
      footer={footer}
      background={background}
    >
      {children}
    </AppLayout>
  );
}
