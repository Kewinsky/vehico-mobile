import type { PropsWithChildren, ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../ThemeProvider";

export type AppLayoutProps = PropsWithChildren<{
  /** Top bar (e.g. <AppHeader />). */
  header?: ReactNode;
  /** Bottom bar with buttons – single shared style (safe area, border) across the app. */
  footer?: ReactNode;
  /** Whether to apply horizontal padding to root (when no header). Usually false for ScrollView/FlatList content. */
  contentPadding?: boolean;
}>;

/**
 * Shared layout for all screens: header + content area (flex:1) + optional footer.
 * Safe area and footer style in one place – consistent look across the app.
 */
export function AppLayout({
  children,
  header,
  footer,
  contentPadding = true,
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
        contentPadding && {
          paddingHorizontal: theme.layout.contentPaddingHorizontal,
        },
      ]}
    >
      {header}
      <View style={styles.content}>{children}</View>
      {footer != null ? (
        <View
          style={[
            styles.footer,
            {
              paddingHorizontal: theme.layout.contentPaddingHorizontal,
              paddingTop: theme.spacing.md,
              paddingBottom: insets.bottom + theme.spacing.md,
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
  footer: {
    borderTopWidth: 1,
  },
});
