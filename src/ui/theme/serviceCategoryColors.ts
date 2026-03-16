import type { ServiceEntryCategory } from "../../types/domain";

// Pastel palette for service entry categories + fuel.
export const SERVICE_CATEGORY_COLORS: Record<
  ServiceEntryCategory | "fuel",
  string
> = {
  maintenance: "#3b82f6", // vivid blue
  repair: "#ef4444", // vivid red
  inspection: "#14b8a6", // vivid teal
  upgrade: "#ec4899", // vivid pink
  oil_change: "#84cc16", // vivid lime
  other: "#6b7280", // muted gray
  fuel: "#FFB803", // accent
};
