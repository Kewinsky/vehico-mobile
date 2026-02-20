import { type PropsWithChildren, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../ThemeProvider";
import { LoadingView } from "./LoadingView";

export type AppLayoutProps = PropsWithChildren<{
  header?: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
}>;

export function AppLayout({
  children,
  header,
  footer,
  loading = false,
}: AppLayoutProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
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
            {
              paddingHorizontal: theme.layout.contentPaddingHorizontal,
              paddingTop: theme.spacing.md,
              paddingBottom: insets.bottom,
              borderTopColor: theme.colors.border,
              backgroundColor: theme.colors.bg,
              gap: theme.spacing.sm,
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
});
