import type { PropsWithChildren, ReactNode } from "react";

import { AppLayout } from "./AppLayout";

export type ScreenProps = PropsWithChildren<{
  header?: ReactNode;
  footer?: ReactNode;
}>;

export function Screen({ children, header, footer }: ScreenProps) {
  return (
    <AppLayout header={header} footer={footer}>
      {children}
    </AppLayout>
  );
}
