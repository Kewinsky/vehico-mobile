import { getUserFacingErrorMessage } from "../errors/userFacingError";
import { showToast } from "./toastStore";

export function toastInfo(title: string, description?: string) {
  showToast({ type: "info", title, description });
}

export function toastSuccess(title: string, description?: string) {
  showToast({ type: "success", title, description });
}

export function toastError(title: string, description?: string) {
  showToast({ type: "error", title, description });
}

export function toastCaughtError(error: unknown, fallback: string) {
  toastError(getUserFacingErrorMessage(error, fallback));
}
