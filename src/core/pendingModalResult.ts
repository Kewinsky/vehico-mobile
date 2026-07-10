/**
 * Generic store for passing data from a modal back to the previous screen.
 * Use when closing a modal with goBack() so the underlying screen can read the result on focus.
 *
 * Each screen/flow should use a unique key (e.g. "fuel", "serviceHistory", "reminders").
 */
const pendingByKey = new Map<string, unknown>();

export function setPendingModalResult<T>(key: string, value: T): void {
  pendingByKey.set(key, value);
}

export function getAndClearPendingModalResult<T>(key: string): T | null {
  const value = pendingByKey.get(key);
  pendingByKey.delete(key);
  return value != null ? (value as T) : null;
}
