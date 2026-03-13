import type { PropsWithChildren, ReactNode } from "react";

import { AppLayout } from "../ui/components/layout/AppLayout";
import {
  useNativeHeaderAsAppNavbar,
  type AppNavbarProps,
} from "../ui/components/layout/AppNavbar";

export type HeaderLayoutProps = PropsWithChildren<
  AppNavbarProps & {
    loading?: boolean;
    footer?: ReactNode;
  }
>;

export function HeaderLayout(props: HeaderLayoutProps) {
  const { children, loading = false, footer, ...navbarProps } = props;

  useNativeHeaderAsAppNavbar({
    ...navbarProps,
    title: undefined,
  });

  return (
    <AppLayout loading={loading} useNativeHeader footer={footer}>
      {children}
    </AppLayout>
  );
}
