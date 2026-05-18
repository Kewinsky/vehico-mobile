export const APP_CURRENCIES = ["PLN", "USD", "EUR", "GBP", "CHF"] as const;

export type AppCurrency = (typeof APP_CURRENCIES)[number];

export function isAppCurrency(value: unknown): value is AppCurrency {
  return (
    typeof value === "string" &&
    (APP_CURRENCIES as readonly string[]).includes(value)
  );
}

export function resolveAppCurrency(
  value: unknown,
  fallback: AppCurrency = "PLN",
): AppCurrency {
  return isAppCurrency(value) ? value : fallback;
}

export const APP_CURRENCY_OPTIONS: readonly {
  value: AppCurrency;
  label: string;
}[] = APP_CURRENCIES.map((code) => ({ value: code, label: code }));
