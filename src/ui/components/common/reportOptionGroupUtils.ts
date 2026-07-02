export type ReportGroupItem = {
  enabled: boolean;
  checked: boolean;
  setChecked: (value: boolean) => void;
};

export function getReportGroupMasterState(items: ReportGroupItem[]) {
  const enabled = items.filter((item) => item.enabled);
  return {
    masterChecked: enabled.length > 0 && enabled.every((item) => item.checked),
    masterDisabled: enabled.length === 0,
  };
}

export function toggleReportGroupMaster(items: ReportGroupItem[]) {
  const enabled = items.filter((item) => item.enabled);
  if (enabled.length === 0) return;
  const allChecked = enabled.every((item) => item.checked);
  const next = !allChecked;
  enabled.forEach((item) => item.setChecked(next));
}

export function hasAnyEnabledReportOption(items: ReportGroupItem[]) {
  return items.some((item) => item.enabled);
}

export function selectAllReportOptions(items: ReportGroupItem[]) {
  items.filter((item) => item.enabled).forEach((item) => item.setChecked(true));
}

export function hasAnyCheckedReportOption(items: ReportGroupItem[]) {
  return items.some((item) => item.checked);
}

export function resetAllReportOptions(items: ReportGroupItem[]) {
  items.forEach((item) => item.setChecked(false));
}
