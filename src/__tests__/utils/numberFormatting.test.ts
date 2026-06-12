import {
  groupThousands,
  localeCodeFromLanguage,
} from "../../utils/numberFormatting";

describe("numberFormatting", () => {
  it("localeCodeFromLanguage maps pl vs fallback en", () => {
    expect(localeCodeFromLanguage("pl")).toBe("pl-PL");
    expect(localeCodeFromLanguage("pl-PL")).toBe("pl-PL");
    expect(localeCodeFromLanguage("en")).toBe("en-GB");
    expect(localeCodeFromLanguage(undefined)).toBe("en-GB");
  });

  it("groupThousands formats integer and decimals", () => {
    expect(groupThousands(1234567)).toBe("1 234 567");
    expect(groupThousands(1234.56, 2)).toBe("1 234.56");
    expect(groupThousands(1234.56, 2, "pl")).toBe("1 234,56");
  });

  it("groupThousands handles negative and non-finite", () => {
    expect(groupThousands(-1500)).toBe("-1 500");
    expect(groupThousands(Number.NaN)).toBe("–");
    expect(groupThousands(Number.POSITIVE_INFINITY)).toBe("–");
  });
});
