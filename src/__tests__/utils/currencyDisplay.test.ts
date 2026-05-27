import {
  getStoreCurrencyAffixes,
  formatStoreCurrency,
  getStoreCurrencyParts,
  getStoreFormattingLocale,
} from "../../utils/currencyDisplay";

jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "pl-PL" }],
}));

describe("currencyDisplay (store prices)", () => {
  it("uses device locale for formatting", () => {
    expect(getStoreFormattingLocale()).toBe("pl-PL");
  });

  it("formats PLN for Polish storefront", () => {
    expect(formatStoreCurrency(9.99, "PLN", "pl-PL")).toMatch(/9,99/);
    expect(formatStoreCurrency(9.99, "PLN", "pl-PL")).toMatch(/zł|PLN/i);
  });

  it("formats USD for US storefront", () => {
    const formatted = formatStoreCurrency(9.99, "USD", "en-US");
    expect(formatted).toContain("9.99");
    expect(formatted).toMatch(/\$/);
  });

  it("exposes currency symbol and fraction digits from store currency", () => {
    const pln = getStoreCurrencyParts(10, "PLN", "pl-PL");
    expect(pln.fractionDigits).toBe(2);
    expect(pln.currencySymbol.length).toBeGreaterThan(0);

    const jpy = getStoreCurrencyParts(1200, "JPY", "ja-JP");
    expect(jpy.fractionDigits).toBe(0);
  });

  it("preserves locale-specific currency placement", () => {
    const usd = getStoreCurrencyAffixes(9.99, "USD", "en-US");
    expect(usd.prefix).toMatch(/\$/);
    expect(usd.suffix).toBe("");

    const pln = getStoreCurrencyAffixes(9.99, "PLN", "pl-PL");
    expect(pln.prefix).toBe("");
    expect(pln.suffix).toMatch(/zł|PLN/i);
  });

  it("prefers storefront affixes from RevenueCat priceString", () => {
    const usdFromStorefront = getStoreCurrencyAffixes(
      9.99,
      "USD",
      "pl-PL",
      "$9.99",
    );
    expect(usdFromStorefront.prefix).toBe("$");
    expect(usdFromStorefront.suffix).toBe("");

    const plnFromStorefront = getStoreCurrencyAffixes(
      9.99,
      "PLN",
      "en-US",
      "9,99 zł",
    );
    expect(plnFromStorefront.prefix).toBe("");
    expect(plnFromStorefront.suffix).toBe(" zł");
  });
});
