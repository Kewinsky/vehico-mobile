type SearchParams = Record<string, string | number | boolean | undefined | null>;

function encodeSearchParams(params?: SearchParams): string {
  if (!params) return "";
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null && value !== "",
  );
  if (entries.length === 0) return "";
  const query = entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
  return `?${query}`;
}

function vehicleBase(vehicleId: string) {
  return `/vehicle/${vehicleId}` as const;
}

export const routes = {
  auth: () => "/auth" as const,
  signIn: () => "/sign-in" as const,
  home: (params?: { showVehiclePicker?: boolean }): "/" | "/?showVehiclePicker=true" =>
    params?.showVehiclePicker ? "/?showVehiclePicker=true" : "/",
  onboarding: () => "/onboarding" as const,
  vehicleForm: (vehicleId?: string) =>
    `/vehicle/new${encodeSearchParams({ vehicleId })}` as const,
  vehicleDashboard: (vehicleId: string) => vehicleBase(vehicleId),
  vehicleMenu: (vehicleId: string) => `${vehicleBase(vehicleId)}/menu` as const,
  manageVehicle: (vehicleId: string) => `${vehicleBase(vehicleId)}/manage` as const,
  dashboardSectionOrder: (vehicleId: string) =>
    `${vehicleBase(vehicleId)}/section-order` as const,
  serviceHistory: (vehicleId: string) =>
    `${vehicleBase(vehicleId)}/service-history` as const,
  serviceHistoryFilters: (vehicleId: string, params?: SearchParams) =>
    `${vehicleBase(vehicleId)}/service-history/filters${encodeSearchParams(params)}` as const,
  serviceEntryForm: (vehicleId: string, entryId?: string) =>
    `${vehicleBase(vehicleId)}/service-history/${entryId ?? "new"}` as const,
  documents: (vehicleId: string) => `${vehicleBase(vehicleId)}/documents` as const,
  fuel: (vehicleId: string) => `${vehicleBase(vehicleId)}/fuel` as const,
  fuelFilters: (vehicleId: string, params?: SearchParams) =>
    `${vehicleBase(vehicleId)}/fuel/filters${encodeSearchParams(params)}` as const,
  fuelingEntryForm: (vehicleId: string, entryId?: string) =>
    `${vehicleBase(vehicleId)}/fuel/${entryId ?? "new"}` as const,
  statistics: (vehicleId: string) => `${vehicleBase(vehicleId)}/statistics` as const,
  reminders: (vehicleId: string) => `${vehicleBase(vehicleId)}/reminders` as const,
  remindersFilters: (vehicleId: string, params?: SearchParams) =>
    `${vehicleBase(vehicleId)}/reminders/filters${encodeSearchParams(params)}` as const,
  reminderForm: (vehicleId: string, reminderId?: string) =>
    `${vehicleBase(vehicleId)}/reminders/${reminderId ?? "new"}` as const,
  share: (vehicleId: string) => `${vehicleBase(vehicleId)}/share` as const,
  publicReport: (vehicleId: string) =>
    `${vehicleBase(vehicleId)}/share/public-report` as const,
  publicReportConfigure: (vehicleId: string) =>
    `${vehicleBase(vehicleId)}/share/public-report/configure` as const,
  publicReportSummary: (vehicleId: string, params?: SearchParams) =>
    `${vehicleBase(vehicleId)}/share/public-report/summary${encodeSearchParams(params)}` as const,
  publicReportOptions: (vehicleId: string, params?: SearchParams) =>
    `${vehicleBase(vehicleId)}/share/public-report/options${encodeSearchParams(params)}` as const,
  publicReportHistory: (vehicleId: string) =>
    `${vehicleBase(vehicleId)}/share/public-report/history` as const,
  marketplace: (vehicleId: string) =>
    `${vehicleBase(vehicleId)}/share/marketplace` as const,
  marketplaceConfigure: (vehicleId: string) =>
    `${vehicleBase(vehicleId)}/share/marketplace/configure` as const,
  marketplaceSummary: (vehicleId: string, params?: SearchParams) =>
    `${vehicleBase(vehicleId)}/share/marketplace/summary${encodeSearchParams(params)}` as const,
  marketplacePostOptions: (vehicleId: string, params?: SearchParams) =>
    `${vehicleBase(vehicleId)}/share/marketplace/options${encodeSearchParams(params)}` as const,
  marketplacePostHistory: (vehicleId: string) =>
    `${vehicleBase(vehicleId)}/share/marketplace/history` as const,
  dataPortability: (vehicleId: string) => `${vehicleBase(vehicleId)}/data` as const,
  exportData: (vehicleId: string) => `${vehicleBase(vehicleId)}/data/export` as const,
  importData: (vehicleId: string) => `${vehicleBase(vehicleId)}/data/import` as const,
  addAttachment: (vehicleId: string) => `${vehicleBase(vehicleId)}/attachments` as const,
  addAttachmentFilters: (vehicleId: string, params?: SearchParams) =>
    `${vehicleBase(vehicleId)}/attachments/filters${encodeSearchParams(params)}` as const,
  wheels: (vehicleId: string) => `${vehicleBase(vehicleId)}/wheels` as const,
  tiresList: (vehicleId: string) => `${vehicleBase(vehicleId)}/wheels/tires` as const,
  tireForm: (vehicleId: string, tireId?: string) =>
    `${vehicleBase(vehicleId)}/wheels/tires/${tireId ?? "new"}` as const,
  wheelsList: (vehicleId: string) => `${vehicleBase(vehicleId)}/wheels/rims` as const,
  wheelsListFilters: (vehicleId: string, params?: SearchParams) =>
    `${vehicleBase(vehicleId)}/wheels/rims/filters${encodeSearchParams(params)}` as const,
  wheelForm: (vehicleId: string, wheelId?: string) =>
    `${vehicleBase(vehicleId)}/wheels/rims/${wheelId ?? "new"}` as const,
  workshops: () => "/workshops" as const,
  workshopForm: (workshopId?: string) =>
    `/workshops/${workshopId ?? "new"}` as const,
  settings: () => "/settings" as const,
  appearance: () => "/appearance" as const,
  shop: () => "/shop" as const,
  exampleListing: () => "/example-listing" as const,
};

export type Routes = typeof routes;
