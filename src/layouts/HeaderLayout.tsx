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
    paddingHorizontal?: boolean;
  }
>;

export function HeaderLayout(props: HeaderLayoutProps) {
  const {
    children,
    loading = false,
    footer,
    paddingHorizontal = true,
    ...navbarProps
  } = props;

  useNativeHeaderAsAppNavbar({
    ...navbarProps,
    title: undefined,
  });

  return (
    <AppLayout
      loading={loading}
      useNativeHeader
      footer={footer}
      useHorizontalContentInset={paddingHorizontal}
    >
      {children}
    </AppLayout>
  );
}
