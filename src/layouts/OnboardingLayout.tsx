import type { PropsWithChildren, ReactNode } from "react";

import { AppLayout } from "../ui/components";

export type OnboardingLayoutProps = PropsWithChildren<{
  header?: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
}>;

export function OnboardingLayout({
  children,
  header,
  footer,
  loading = false,
}: OnboardingLayoutProps) {
  return (
    <AppLayout loading={loading} header={header} footer={footer}>
      {children}
    </AppLayout>
  );
}
