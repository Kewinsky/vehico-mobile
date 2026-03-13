import type { PropsWithChildren, ReactNode } from "react";

import { HeaderLayout } from "../../../layouts";
import type { HeaderLayoutProps } from "../../../layouts/HeaderLayout";
import { NativeHeaderScrollView } from "./NativeHeaderScrollView";
import { ContentHeader } from "./ContentHeader";

export type HeaderContentScreenProps = PropsWithChildren<
  Omit<HeaderLayoutProps, "children" | "footer"> & {
    /** Title rendered in the screen content (not in native header). */
    title: string;
    /** Optional subtitle under the title. */
    subtitle?: string;
    /** Optional footer rendered at the bottom via HeaderLayout/AppLayout. */
    footer?: ReactNode;
    /** Control vertical scrolling (passed to NativeHeaderScrollView). */
    scrollEnabled?: boolean;
  }
>;

export function HeaderContentScreen({
  title,
  subtitle,
  children,
  footer,
  scrollEnabled,
  ...headerLayoutProps
}: HeaderContentScreenProps) {
  return (
    <HeaderLayout {...headerLayoutProps} footer={footer}>
      <NativeHeaderScrollView scrollEnabled={scrollEnabled}>
        <ContentHeader title={title} subtitle={subtitle} />
        {children}
      </NativeHeaderScrollView>
    </HeaderLayout>
  );
}

