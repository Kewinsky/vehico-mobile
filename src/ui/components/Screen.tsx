import type { PropsWithChildren, ReactNode } from "react";

import { AppLayout } from "./AppLayout";

export type ScreenProps = PropsWithChildren<{
  /** Whether to apply horizontal padding to root (when no header). */
  padding?: boolean;
  /** Header (e.g. <AppHeader />) – rendered above content. */
  header?: ReactNode;
  /** Bottom bar with buttons – style (safe area, border) is defined in AppLayout. */
  footer?: ReactNode;
}>;

/** Shared screen layout – delegates to AppLayout (single footer definition across the app). */
export function Screen({
  children,
  padding = true,
  header,
  footer,
}: ScreenProps) {
  return (
    <AppLayout
      header={header}
      footer={footer}
      contentPadding={padding && !header}
    >
      {children}
    </AppLayout>
  );
}
