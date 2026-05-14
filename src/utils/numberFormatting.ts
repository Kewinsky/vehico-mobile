function normalizeLanguage(language?: string | null): string {
  return (language ?? "en").toLowerCase();
}

export function localeCodeFromLanguage(
  language?: string | null,
): "pl-PL" | "en-GB" {
  return normalizeLanguage(language).startsWith("pl") ? "pl-PL" : "en-GB";
}

function decimalSeparator(language?: string | null): string {
  return normalizeLanguage(language).startsWith("pl") ? "," : ".";
}

export function groupThousands(
  value: number,
  fractionDigits = 0,
  language?: string | null,
): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const [integerPart, fractionPart] = abs.toFixed(fractionDigits).split(".");
  const groupSeparator = " ";
  const groupedInteger = integerPart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    groupSeparator,
  );
  if (!fractionPart) return `${sign}${groupedInteger}`;
  const decSep = decimalSeparator(language);
  return `${sign}${groupedInteger}${decSep}${fractionPart}`;
}
