import type { PropsWithChildren, ReactNode } from "react";
import { useLayoutEffect } from "react";
import { useNavigation } from "expo-router/react-navigation";

import { AppLayout } from "../ui/components/layout/AppLayout";
import { ModalButton } from "../ui/components/layout/ModalButton";
import { useTheme } from "../ui/ThemeProvider";
import { NativeHeaderScrollView } from "../ui/components/layout/NativeHeaderScrollView";

export type ModalLayoutProps = PropsWithChildren<{
  title?: string;
  cancel?: {
    onPress: () => void;
    label?: string;
  };
  done?: {
    onPress: () => void;
    label?: string;
    disabled?: boolean;
    loading?: boolean;
  };
  loading?: boolean;
  ready?: boolean;
  minLoadingMs?: number;
  footer?: ReactNode;
  footerTransparent?: boolean;
  background?: ReactNode;
  useNativeHeaderScrollView?: boolean;
  scrollEnabled?: boolean;
  useHorizontalContentInset?: boolean;
}>;

export function ModalLayout({
  children,
  title = "",
  cancel,
  done,
  loading = false,
  ready = true,
  minLoadingMs = 0,
  footer,
  footerTransparent = false,
  background,
  useNativeHeaderScrollView = false,
  scrollEnabled,
  useHorizontalContentInset = true,
}: ModalLayoutProps) {
  const { theme } = useTheme();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: title,
      headerBackVisible: false,
      headerTransparent: true,
      headerStyle: {
        backgroundColor: "transparent",
      },
      headerTitleStyle: {
        color: theme.colors.fg,
        fontWeight: theme.typography.fontWeight.bold,
        fontSize: theme.typography.title,
      },
      headerShadowVisible: false,
      headerLeft:
        cancel != null
          ? () => (
              <ModalButton
                variant="cancel"
                onPress={cancel.onPress}
                {...(cancel.label ? { children: cancel.label } : {})}
              />
            )
          : undefined,
      headerRight:
        done != null
          ? () => (
              <ModalButton
                variant="done"
                onPress={done.onPress}
                disabled={done.disabled}
                loading={done.loading}
                {...(done.label ? { children: done.label } : {})}
              />
            )
          : undefined,
    });
  }, [
    navigation,
    title,
    cancel,
    done,
    theme.colors.bg,
    theme.colors.fg,
    theme.typography.fontWeight.bold,
    theme.typography.title,
  ]);

  const content = useNativeHeaderScrollView ? (
    <NativeHeaderScrollView scrollEnabled={scrollEnabled}>
      {children}
    </NativeHeaderScrollView>
  ) : (
    children
  );

  return (
    <AppLayout
      loading={loading}
      ready={ready}
      minLoadingMs={minLoadingMs}
      isModal
      useNativeHeader
      footer={footer}
      footerTransparent={footerTransparent}
      background={background}
      useHorizontalContentInset={useHorizontalContentInset}
    >
      {content}
    </AppLayout>
  );
}
