import type { PropsWithChildren, ReactNode } from "react";
import { useLayoutEffect } from "react";
import { useNavigation } from "@react-navigation/native";

import { AppLayout } from "../ui/components/layout/AppLayout";
import { ModalButton } from "../ui/components/layout/ModalButton";
import { ModalHeaderTitle } from "../ui/components/layout/ModalHeaderTitle";
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
  right?: ReactNode;
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
  right,
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
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: title
        ? () => <ModalHeaderTitle>{title}</ModalHeaderTitle>
        : "",
      headerTitleAlign: "center",
      headerBackVisible: false,
      headerTransparent: true,
      headerStyle: {
        backgroundColor: "transparent",
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
          : right != null
            ? () => right
            : undefined,
    });
  }, [navigation, title, cancel, done, right]);

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
