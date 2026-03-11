import type { PropsWithChildren, ReactNode } from "react";
import { useLayoutEffect } from "react";
import { Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { HeaderButton } from "@react-navigation/elements";
import { Ionicons } from "@expo/vector-icons";
import { Crown } from "lucide-react-native";

import { AppLayout } from "../ui/components/layout/AppLayout";
import { useTheme } from "../ui/ThemeProvider";
import type { AppStackParamList } from "../app/navigation/RootNavigator";
import { useAuth } from "../app/providers/AuthProvider";

export type WelcomeHeaderLayoutProps = PropsWithChildren<{
  title: string;
  showProfileAvatar?: boolean;
  showShopIcon?: boolean;
  right?: ReactNode;
  loading?: boolean;
  footer?: ReactNode;
}>;

export function WelcomeHeaderLayout({
  children,
  title,
  showProfileAvatar = false,
  showShopIcon = false,
  right,
  loading = false,
  footer,
}: WelcomeHeaderLayoutProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation =
    useNavigation<
      NativeStackNavigationProp<AppStackParamList, keyof AppStackParamList>
    >();

  const showSettingsIcon = showProfileAvatar && user;
  const rightContent =
    showShopIcon || showSettingsIcon || right !== undefined ? (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
        }}
      >
        {showShopIcon && (
          <HeaderButton
            onPress={() => navigation.navigate("Shop")}
            tintColor={theme.colors.accent}
            accessibilityLabel="Shop"
          >
            <Crown
              size={theme.icons.headerButton}
              color={theme.colors.accent}
            />
          </HeaderButton>
        )}
        {showSettingsIcon && (
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
    ) : null;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
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
      headerBackVisible: false,
      headerRight: rightContent ? () => rightContent : undefined,
      headerStyle: { backgroundColor: theme.colors.bg },
      headerShadowVisible: false,
    });
  }, [
    navigation,
    title,
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
  ]);

  return (
    <AppLayout loading={loading} useNativeHeader footer={footer}>
      {children}
    </AppLayout>
  );
}
