import type { TFunction } from "i18next";
import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

export type ShopCompareRowId =
  | "vehicles"
  | "reminders"
  | "workshops"
  | "tires"
  | "wheels"
  | "onlineReports"
  | "marketplacePosts"
  | "customLayout"
  | "smartBanners"
  | "advancedCharts";

export type ShopCompareIcon =
  | { type: "ionicons"; name: ComponentProps<typeof Ionicons>["name"] }
  | { type: "tire" };

export type ShopCompareExampleLink =
  | { kind: "url"; url: string }
  | { kind: "exampleListing" };

export type ShopCompareRow = {
  id: ShopCompareRowId;
  icon: ShopCompareIcon;
  label: string;
  free: string;
  premium: string;
  exampleLink?: ShopCompareExampleLink;
};

const FREE_LIMITS = {
  vehicles: 1,
  reminders: 5,
  workshops: 3,
  tireSets: 1,
  wheelSets: 1,
} as const;

export function getShopComparisonRows(
  t: TFunction,
  options?: { exampleReportUrl: string },
): ShopCompareRow[] {
  return [
    {
      id: "vehicles",
      icon: { type: "ionicons", name: "car-sport-outline" },
      label: t("shop.compare.vehicles"),
      free: t("shop.compare.freeCount", { count: FREE_LIMITS.vehicles }),
      premium: t("shop.compare.unlimited"),
    },
    {
      id: "reminders",
      icon: { type: "ionicons", name: "notifications-outline" },
      label: t("shop.compare.reminders"),
      free: t("shop.compare.freeUpTo", { count: FREE_LIMITS.reminders }),
      premium: t("shop.compare.unlimited"),
    },
    {
      id: "workshops",
      icon: { type: "ionicons", name: "construct-outline" },
      label: t("shop.compare.workshops"),
      free: t("shop.compare.freeUpTo", { count: FREE_LIMITS.workshops }),
      premium: t("shop.compare.unlimited"),
    },
    {
      id: "tires",
      icon: { type: "tire" },
      label: t("shop.compare.tires"),
      free: t("shop.compare.freePerVehicle", { count: FREE_LIMITS.tireSets }),
      premium: t("shop.compare.unlimited"),
    },
    {
      id: "wheels",
      icon: { type: "ionicons", name: "disc-outline" },
      label: t("shop.compare.wheels"),
      free: t("shop.compare.freePerVehicle", { count: FREE_LIMITS.wheelSets }),
      premium: t("shop.compare.unlimited"),
    },
    {
      id: "onlineReports",
      icon: { type: "ionicons", name: "document-text-outline" },
      label: t("shop.compare.onlineReports"),
      free: t("shop.compare.notAvailable"),
      premium: t("shop.compare.included"),
      exampleLink: options?.exampleReportUrl
        ? { kind: "url", url: options.exampleReportUrl }
        : undefined,
    },
    {
      id: "marketplacePosts",
      icon: { type: "ionicons", name: "megaphone-outline" },
      label: t("shop.compare.marketplacePosts"),
      free: t("shop.compare.notAvailable"),
      premium: t("shop.compare.included"),
      exampleLink: { kind: "exampleListing" },
    },
    {
      id: "customLayout",
      icon: { type: "ionicons", name: "grid-outline" },
      label: t("shop.compare.customLayout"),
      free: t("shop.compare.notAvailable"),
      premium: t("shop.compare.included"),
    },
    {
      id: "smartBanners",
      icon: { type: "ionicons", name: "sparkles-outline" },
      label: t("shop.compare.smartBanners"),
      free: t("shop.compare.basic"),
      premium: t("shop.compare.fullSuite"),
    },
    {
      id: "advancedCharts",
      icon: { type: "ionicons", name: "stats-chart-outline" },
      label: t("shop.compare.advancedCharts"),
      free: t("shop.compare.basicCharts"),
      premium: t("shop.compare.advancedChartsPremium"),
    },
  ];
}
