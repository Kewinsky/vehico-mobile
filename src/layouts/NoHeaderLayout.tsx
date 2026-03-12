import type { PropsWithChildren, ReactNode } from "react";

import { AppLayout } from "../ui/components/layout/AppLayout";

export type NoHeaderLayoutProps = PropsWithChildren<{
  loading?: boolean;
  footer?: ReactNode;
  background?: ReactNode;
}>;

export function NoHeaderLayout({
  children,
  loading = false,
  footer,
  background,
}: NoHeaderLayoutProps) {
  return (
    <AppLayout loading={loading} footer={footer} background={background}>
      {children}
    </AppLayout>
  );
}
