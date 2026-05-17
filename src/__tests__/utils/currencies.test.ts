import {
  APP_CURRENCIES,
  isAppCurrency,
  resolveAppCurrency,
} from "../../utils/currencies";

describe("currencies", () => {
  it("includes PLN, USD, EUR, GBP, CHF", () => {
    expect(APP_CURRENCIES).toEqual(["PLN", "USD", "EUR", "GBP", "CHF"]);
  });

  it("resolveAppCurrency falls back for unknown codes", () => {
    expect(resolveAppCurrency("EUR")).toBe("EUR");
    expect(resolveAppCurrency("JPY")).toBe("PLN");
    expect(isAppCurrency("GBP")).toBe(true);
    expect(isAppCurrency("XXX")).toBe(false);
  });
});
