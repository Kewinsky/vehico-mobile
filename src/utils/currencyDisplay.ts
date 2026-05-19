export function getCurrencySymbol(
  currencyCode: string | undefined,
  locale: string,
): string {
  if (!currencyCode) return "";
  try {
    const part = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      currencyDisplay: "narrowSymbol",
    })
      .formatToParts(1)
      .find((p) => p.type === "currency");
    return part?.value?.trim() ?? currencyCode;
  } catch {
    return currencyCode;
  }
}
