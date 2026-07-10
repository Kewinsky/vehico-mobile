import { enqueueToast, type ToastType } from "./toastStore";

function showToast(
  type: ToastType,
  title: string,
  description?: string,
): void {
  enqueueToast({
    type,
    title,
    description: description?.trim() || undefined,
  });
}

export function toastInfo(title: string, description?: string) {
  showToast("info", title, description);
}

export function toastSuccess(title: string, description?: string) {
  showToast("success", title, description);
}

export function toastError(title: string, description?: string) {
  showToast("error", title, description);
}
