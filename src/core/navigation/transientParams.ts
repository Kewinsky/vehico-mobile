const transientByKey = new Map<string, unknown>();

export function setTransientParams<T>(key: string, value: T): void {
  transientByKey.set(key, value);
}

export function consumeTransientParams<T>(key: string): T | null {
  const value = transientByKey.get(key);
  transientByKey.delete(key);
  return value != null ? (value as T) : null;
}

export const transientKeys = {
  marketplaceSummary: "marketplaceSummary",
  marketplacePostOptions: "marketplacePostOptions",
  publicReportSummary: "publicReportSummary",
  publicReportOptions: "publicReportOptions",
  marketplacePostHistory: "marketplacePostHistory",
  publicReportHistory: "publicReportHistory",
} as const;
