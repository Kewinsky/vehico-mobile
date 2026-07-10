export type ToastType = "success" | "error" | "info";

export type ToastPayload = {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
};

type ToastListener = (toast: ToastPayload | null) => void;

const TOAST_DURATION_MS = 3200;
const TOAST_GAP_MS = 150;

const listeners = new Set<ToastListener>();
let currentToast: ToastPayload | null = null;
let queue: ToastPayload[] = [];
let nextId = 0;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  for (const listener of listeners) {
    listener(currentToast);
  }
}

function clearHideTimer() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

function present(toast: ToastPayload) {
  clearHideTimer();
  currentToast = toast;
  emit();
  hideTimer = setTimeout(() => dismissCurrent(), TOAST_DURATION_MS);
}

function dismissCurrent() {
  clearHideTimer();
  currentToast = null;
  emit();

  const next = queue.shift();
  if (!next) return;
  setTimeout(() => present(next), TOAST_GAP_MS);
}

export function subscribe(listener: ToastListener): () => void {
  listeners.add(listener);
  listener(currentToast);
  return () => listeners.delete(listener);
}

export function enqueueToast(
  toast: Omit<ToastPayload, "id">,
): void {
  const payload: ToastPayload = { ...toast, id: ++nextId };
  if (!currentToast) {
    present(payload);
    return;
  }
  queue.push(payload);
}
