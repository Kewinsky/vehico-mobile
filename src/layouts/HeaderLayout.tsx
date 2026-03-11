import type { PropsWithChildren, ReactNode } from "react";

import {
  AppLayout,
  useNativeHeaderAsAppNavbar,
  type AppNavbarProps,
} from "../ui/components";

export type HeaderLayoutProps = PropsWithChildren<
  AppNavbarProps & {
    loading?: boolean;
    footer?: ReactNode;
  }
>;

export function HeaderLayout({
  children,
  loading = false,
  footer,
  onBack,
  right,
  title,
  showProfileAvatar,
  showShopIcon,
}: HeaderLayoutProps) {
  useNativeHeaderAsAppNavbar({
    onBack,
    right,
    title,
    showProfileAvatar,
    showShopIcon,
  });

  return (
    <AppLayout loading={loading} useNativeHeader footer={footer}>
      {children}
    </AppLayout>
  );
}
