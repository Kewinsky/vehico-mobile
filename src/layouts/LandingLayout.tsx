import type { PropsWithChildren, ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../ui/ThemeProvider";
import { LoadingView } from "../ui/components/common/LoadingView";

export type LandingLayoutProps = PropsWithChildren<{
  loading?: boolean;
  background?: ReactNode;
  stickyBottom?: ReactNode;
}>;

export function LandingLayout({
  children,
  loading = false,
  background,
  stickyBottom,
}: LandingLayoutProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const stickyBottomInset =
    stickyBottom != null ? insets.bottom + theme.spacing.xl * 2 : 0;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.bg,
        },
      ]}
    >
      {background != null ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {background}
        </View>
      ) : null}

      {loading ? (
        <LoadingView />
      ) : (
        <View
          style={[
            styles.content,
            {
              paddingHorizontal: theme.layout.contentPaddingHorizontal,
              paddingBottom: stickyBottomInset,
            },
          ]}
        >
          {children}
        </View>
      )}

      {stickyBottom != null ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.stickyBottomWrap,
            {
              paddingHorizontal: theme.layout.contentPaddingHorizontal,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          {stickyBottom}
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
  stickyBottomWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
});
