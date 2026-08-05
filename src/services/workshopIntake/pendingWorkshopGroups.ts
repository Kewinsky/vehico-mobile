import type { ServiceEntry } from "../../types/domain";

export type PendingWorkshopGroup = {
  key: string;
  name: string;
  phone: string | null;
  entries: ServiceEntry[];
};

export function workshopGroupKey(name: string | null | undefined): string {
  const trimmed = name?.trim() ?? "";
  return trimmed.length > 0 ? trimmed.toLocaleLowerCase() : "__unknown__";
}

export function groupPendingByWorkshop(
  entries: ServiceEntry[],
): PendingWorkshopGroup[] {
  const map = new Map<string, PendingWorkshopGroup>();

  for (const entry of entries) {
    const key = workshopGroupKey(entry.submitted_workshop_name);
    const existing = map.get(key);
    const phone = entry.submitted_workshop_phone?.trim() || null;

    if (existing) {
      existing.entries.push(entry);
      if (!existing.phone && phone) {
        existing.phone = phone;
      }
      continue;
    }

    map.set(key, {
      key,
      name: entry.submitted_workshop_name?.trim() || "–",
      phone,
      entries: [entry],
    });
  }

  return Array.from(map.values());
}

export function latestSubmittedAt(entries: ServiceEntry[]): string | null {
  let latest: string | null = null;
  for (const entry of entries) {
    const at = entry.created_at?.trim();
    if (!at) continue;
    if (!latest || at > latest) latest = at;
  }
  return latest;
}
