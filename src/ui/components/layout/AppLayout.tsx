import { type PropsWithChildren, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../ThemeProvider";
import { LoadingView } from "../common/LoadingView";

export type AppLayoutProps = PropsWithChildren<{
  header?: ReactNode;
  footer?: ReactNode;
  footerTransparent?: boolean;
  loading?: boolean;
  isModal?: boolean;
  background?: ReactNode;
  useNativeHeader?: boolean;
  useHorizontalContentInset?: boolean;
}>;

export function AppLayout({
  children,
  header,
  footer,
  loading = false,
  isModal = false,
  background,
  useNativeHeader = false,
  useHorizontalContentInset = true,
}: AppLayoutProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const skipTopPadding = isModal || useNativeHeader;
  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: skipTopPadding ? 0 : insets.top,
          backgroundColor: theme.colors.bg,
        },
      ]}
    >
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
            useHorizontalContentInset
              ? {
                  marginHorizontal: theme.layout.contentPaddingHorizontal,
                }
              : null,
          ]}
        >
          {children}
        </View>
      )}
      {footer != null ? (
        <View
          style={[
            useHorizontalContentInset
              ? {
                  paddingHorizontal: theme.layout.contentPaddingHorizontal,
                  paddingBottom: insets.bottom,
                  borderTopColor: theme.colors.border,
                  backgroundColor: theme.colors.bg,
                  gap: theme.spacing.sm,
                }
              : {
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
