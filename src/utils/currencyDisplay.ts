import { getLocales } from "expo-localization";

/** Device locale – closest match to App Store / Play regional price formatting. */
export function getStoreFormattingLocale(): string {
  return getLocales()[0]?.languageTag ?? "en-US";
}

export function formatStoreCurrency(
  amount: number,
  currencyCode: string | undefined,
  locale: string = getStoreFormattingLocale(),
): string {
  if (!currencyCode || !Number.isFinite(amount)) return "";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
    }).format(amount);
  } catch {
    return `${amount} ${currencyCode}`;
  }
}

export function getStoreCurrencyParts(
  amount: number,
  currencyCode: string | undefined,
  locale: string = getStoreFormattingLocale(),
): { currencySymbol: string; fractionDigits: number } {
  if (!currencyCode || !Number.isFinite(amount)) {
    return { currencySymbol: "", fractionDigits: 2 };
  }
  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
    });
    const parts = formatter.formatToParts(amount);
    const currencySymbol =
      parts.find((part) => part.type === "currency")?.value?.trim() ??
      currencyCode;
    const fractionDigits =
      formatter.resolvedOptions().maximumFractionDigits ?? 2;
    return { currencySymbol, fractionDigits };
  } catch {
    return { currencySymbol: currencyCode, fractionDigits: 2 };
  }
}

const NUMERIC_PART_TYPES = new Set([
  "integer",
  "group",
  "decimal",
  "fraction",
  "minusSign",
  "plusSign",
  "nan",
  "infinity",
]);

export function getStoreCurrencyAffixes(
  amount: number,
  currencyCode: string | undefined,
  locale: string = getStoreFormattingLocale(),
): { prefix: string; suffix: string; fractionDigits: number } {
  if (!currencyCode || !Number.isFinite(amount)) {
    return { prefix: "", suffix: "", fractionDigits: 2 };
  }

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
    });
    const parts = formatter.formatToParts(amount);
    const fractionDigits =
      formatter.resolvedOptions().maximumFractionDigits ?? 2;
    const firstNumericIndex = parts.findIndex((part) =>
      NUMERIC_PART_TYPES.has(part.type),
    );
    let lastNumericIndex = -1;
    for (let index = parts.length - 1; index >= 0; index -= 1) {
      if (NUMERIC_PART_TYPES.has(parts[index].type)) {
        lastNumericIndex = index;
        break;
      }
    }

    if (firstNumericIndex === -1 || lastNumericIndex === -1) {
      return { prefix: "", suffix: "", fractionDigits };
    }

    return {
      prefix: parts
        .slice(0, firstNumericIndex)
        .map((part) => part.value)
        .join(""),
      suffix: parts
        .slice(lastNumericIndex + 1)
        .map((part) => part.value)
        .join(""),
      fractionDigits,
    };
  } catch {
    return { prefix: "", suffix: ` ${currencyCode}`, fractionDigits: 2 };
  }
}

/** @deprecated Prefer formatStoreCurrency – kept for narrow symbol use. */
export function getCurrencySymbol(
  currencyCode: string | undefined,
  locale: string,
): string {
  if (!currencyCode) return "";
  return getStoreCurrencyParts(1, currencyCode, locale).currencySymbol;
}
