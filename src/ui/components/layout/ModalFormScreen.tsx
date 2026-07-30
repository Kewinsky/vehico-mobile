import type { PropsWithChildren, ReactNode } from "react";

import { ModalLayout } from "../../../layouts";
import { FormScreen } from "./FormScreen";
import { NativeHeaderScrollView } from "./NativeHeaderScrollView";

export type ModalFormScreenProps = PropsWithChildren<{
  title?: string;
  onCancel: () => void;
  onDone: () => void;
  doneLabel?: string;
  cancelLabel?: string;
  doneDisabled?: boolean;
  footer?: ReactNode;
  scrollEnabled?: boolean;
}>;

export function ModalFormScreen({
  title = "",
  onCancel,
  onDone,
  doneLabel,
  cancelLabel,
  doneDisabled,
  footer,
  scrollEnabled = true,
  children,
}: ModalFormScreenProps) {
  return (
    <ModalLayout
      title={title}
      cancel={{ onPress: onCancel, label: cancelLabel }}
      done={{ onPress: onDone, label: doneLabel, disabled: doneDisabled }}
      footer={footer}
    >
      <FormScreen noLayout scrollEnabled={scrollEnabled}>
        <NativeHeaderScrollView>{children}</NativeHeaderScrollView>
      </FormScreen>
    </ModalLayout>
  );
}
