import type { PropsWithChildren, ReactNode } from "react";
import { useLayoutEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { Platform } from "react-native";
import type { NativeStackHeaderItem } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useTheme } from "../ui/ThemeProvider";
import { nativeHeaderButton } from "../ui/components/layout/nativeHeaderItems";

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
  nativeRightItems?: NativeStackHeaderItem[];
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
  nativeRightItems,
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
  const { theme } = useTheme();
  const { t } = useTranslation();

  useLayoutEffect(() => {
    const nativeLeft: NativeStackHeaderItem[] = [];
    const nativeRight: NativeStackHeaderItem[] = [];
    if (cancel) {
      nativeLeft.push(nativeHeaderButton(cancel.label ?? t("common.cancel"), "xmark", cancel.onPress, { tintColor: theme.colors.fg }));
    }
    if (done) {
      nativeRight.push(nativeHeaderButton(
        done.loading ? t("common.saving") : (done.label ?? t("common.done")),
        "checkmark",
        done.onPress,
        { disabled: done.disabled || done.loading, variant: "done", tintColor: theme.colors.accent },
      ));
    } else if (nativeRightItems) {
      nativeRight.push(...nativeRightItems);
    } else if (right != null) {
      nativeRight.push({ type: "custom", element: <>{right}</> });
    }
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
      ...(Platform.OS === "ios" ? {
        headerLeft: undefined,
        headerRight: undefined,
        unstable_headerLeftItems: () => nativeLeft,
        unstable_headerRightItems: () => nativeRight,
        headerTintColor: theme.colors.accent,
      } : {}),
    });
  }, [navigation, title, cancel, done, right, nativeRightItems, t, theme.colors.accent, theme.colors.fg]);

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
