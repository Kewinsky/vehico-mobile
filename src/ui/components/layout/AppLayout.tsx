import {
  type PropsWithChildren,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../ThemeProvider";
import { LoadingView } from "../common/LoadingView";

export type AppLayoutProps = PropsWithChildren<{
  header?: ReactNode;
  footer?: ReactNode;
  footerTransparent?: boolean;
  loading?: boolean;
  ready?: boolean;
  minLoadingMs?: number;
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
  ready = true,
  minLoadingMs = 0,
  isModal = false,
  background,
  useNativeHeader = false,
  useHorizontalContentInset = true,
}: AppLayoutProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [minDelayPassed, setMinDelayPassed] = useState(minLoadingMs <= 0);
  const skipTopPadding = isModal || useNativeHeader;
  const isReady = ready && minDelayPassed;
  const shouldShowLoading = loading || !isReady;

  useEffect(() => {
    if (minLoadingMs <= 0) {
      setMinDelayPassed(true);
      return;
    }
    setMinDelayPassed(false);
    const timeoutId = setTimeout(() => {
      setMinDelayPassed(true);
    }, minLoadingMs);
    return () => clearTimeout(timeoutId);
  }, [minLoadingMs]);

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
      {shouldShowLoading ? (
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
