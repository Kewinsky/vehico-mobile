import type { PropsWithChildren, ReactNode } from "react";

import { HeaderLayout } from "../../../layouts";
import type { HeaderLayoutProps } from "../../../layouts/HeaderLayout";
import {
  NativeHeaderScrollView,
  type NativeHeaderScrollViewProps,
} from "./NativeHeaderScrollView";
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
    contentInsetAdjustmentBehavior?: NativeHeaderScrollViewProps["contentInsetAdjustmentBehavior"];
  }
>;

export function HeaderContentScreen({
  title,
  subtitle,
  children,
  footer,
  scrollEnabled,
  contentInsetAdjustmentBehavior,
  ...headerLayoutProps
}: HeaderContentScreenProps) {
  return (
    <HeaderLayout {...headerLayoutProps} footer={footer}>
      <NativeHeaderScrollView
        scrollEnabled={scrollEnabled}
        contentInsetAdjustmentBehavior={contentInsetAdjustmentBehavior}
      >
        <ContentHeader title={title} subtitle={subtitle} />
        {children}
      </NativeHeaderScrollView>
    </HeaderLayout>
  );
}

