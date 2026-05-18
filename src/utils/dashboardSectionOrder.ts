/** Merges stored order with defaults: keeps valid IDs, drops unknown, appends new sections. */
export function normalizeSectionOrder<T extends string>(
  defaultOrder: readonly T[],
  stored: unknown,
): T[] {
  const defaults = [...defaultOrder];
  if (!Array.isArray(stored)) {
    return defaults;
  }

  const valid = new Set<string>(defaults);
  const seen = new Set<string>();
  const result: T[] = [];

  for (const entry of stored) {
    if (typeof entry !== "string" || !valid.has(entry) || seen.has(entry)) {
      continue;
    }
    seen.add(entry);
    result.push(entry as T);
  }

  for (const id of defaults) {
    if (!seen.has(id)) {
      result.push(id);
    }
  }

  return result;
}

export function sectionOrdersEqual(a: readonly string[], b: readonly string[]) {
  if (a.length !== b.length) return false;
  return a.every((id, index) => id === b[index]);
}
