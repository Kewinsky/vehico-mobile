import type { PropsWithChildren, ReactNode } from "react";
import { useLayoutEffect } from "react";
import { useNavigation } from "@react-navigation/native";

import { AppLayout, ModalButton } from "../ui/components";
import { useTheme } from "../ui/ThemeProvider";

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
  };
  loading?: boolean;
  footer?: ReactNode;
}>;

export function ModalLayout({
  children,
  title = "",
  cancel,
  done,
  loading = false,
  footer,
}: ModalLayoutProps) {
  const { theme } = useTheme();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: title,
      headerBackVisible: false,
      headerStyle: { backgroundColor: theme.colors.bg },
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

  return (
    <AppLayout loading={loading} isModal useNativeHeader footer={footer}>
      {children}
    </AppLayout>
  );
}
