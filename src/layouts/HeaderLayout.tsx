import type { PropsWithChildren, ReactNode } from "react";

import { AppLayout } from "../ui/components/layout/AppLayout";
import {
  useNativeHeaderAsAppNavbar,
  type AppNavbarProps,
} from "../ui/components/layout/AppNavbar";

export type HeaderLayoutProps = PropsWithChildren<
  AppNavbarProps & {
    loading?: boolean;
    ready?: boolean;
    minLoadingMs?: number;
    footer?: ReactNode;
    background?: ReactNode;
    paddingHorizontal?: boolean;
  }
>;

export function HeaderLayout(props: HeaderLayoutProps) {
  const {
    children,
    loading = false,
    ready = true,
    minLoadingMs = 0,
    footer,
    background,
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
      ready={ready}
      minLoadingMs={minLoadingMs}
      useNativeHeader
      footer={footer}
      background={background}
      useHorizontalContentInset={paddingHorizontal}
    >
      {children}
    </AppLayout>
  );
}
