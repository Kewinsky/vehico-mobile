import type { PropsWithChildren, ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DecorativeBackground } from "../ui/components/branding/DecorativeBackground";
import { LoadingView } from "../ui/components/common/LoadingView";
import { useTheme } from "../ui/ThemeProvider";

export type OnboardingLayoutProps = PropsWithChildren<{
  header?: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
  /** Optional background layer rendered above the default decorative one. */
  background?: ReactNode;
}>;

export function OnboardingLayout({
  children,
  header,
  footer,
  loading = false,
  background,
}: OnboardingLayoutProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top,
          backgroundColor: theme.colors.bg,
        },
      ]}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <DecorativeBackground variant="onboarding" />
      </View>

      {background != null ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {background}
        </View>
      ) : null}

      {header}

      {loading ? (
        <LoadingView />
      ) : (
        <View
          style={[
            styles.content,
            { paddingHorizontal: theme.layout.contentPaddingHorizontal },
          ]}
        >
          {children}
        </View>
      )}

      {footer != null ? (
        <View
          style={[
            styles.footerWrap,
            {
              paddingHorizontal: theme.layout.contentPaddingHorizontal,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  footerWrap: {
    backgroundColor: "transparent",
  },
});
