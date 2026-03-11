import type { PropsWithChildren, ReactNode } from "react";

import { AppLayout } from "../ui/components/layout/AppLayout";

export type NoHeaderLayoutProps = PropsWithChildren<{
  loading?: boolean;
  footer?: ReactNode;
}>;

export function NoHeaderLayout({
  children,
  loading = false,
  footer,
}: NoHeaderLayoutProps) {
  return (
    <AppLayout loading={loading} footer={footer}>
      {children}
    </AppLayout>
  );
}
