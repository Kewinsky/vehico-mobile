export type ToastType = "success" | "error" | "info";

export type ToastPayload = {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
};

type ToastListener = (toast: ToastPayload | null) => void;

const TOAST_DURATION_MS = 3200;

let listener: ToastListener | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

export function subscribe(nextListener: ToastListener) {
  listener = nextListener;
  return () => {
    if (listener === nextListener) {
      listener = null;
    }
  };
}

export function showToast(payload: {
  type: ToastType;
  title: string;
  description?: string;
}) {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }

  listener?.({
    id: `${Date.now()}`,
    type: payload.type,
    title: payload.title,
    description: payload.description,
  });

  hideTimer = setTimeout(() => {
    listener?.(null);
    hideTimer = null;
  }, TOAST_DURATION_MS);
}
