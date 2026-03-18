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

/** Pastel icon backgrounds (aligned with web report timeline9 / report-colors). */
export const SERVICE_CATEGORY_ICON_BACKGROUND: Record<
  ServiceEntryCategory | "fuel",
  string
> = {
  oil_change: "rgba(132,204,22,0.1)",
  maintenance: "rgba(59,130,246,0.1)",
  repair: "rgba(239,68,68,0.1)",
  inspection: "rgba(20,184,166,0.1)",
  upgrade: "rgba(236,72,153,0.1)",
  fuel: "rgba(255,184,3,0.1)",
  other: "rgba(107,114,128,0.1)",
};
