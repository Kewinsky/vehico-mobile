import {
  canProceedMarketplaceConfigure,
  marketplaceConfigureFieldErrors,
  parseMarketplacePrice,
} from "../../forms/marketplaceConfigureForm";

describe("marketplaceConfigureForm", () => {
  it("allows proceeding without price when option is off", () => {
    expect(canProceedMarketplaceConfigure({ includePrice: false, price: "" })).toBe(
      true,
    );
  });

  it("requires a positive decimal price when option is on", () => {
    expect(
      canProceedMarketplaceConfigure({ includePrice: true, price: "" }),
    ).toBe(false);
    expect(
      marketplaceConfigureFieldErrors({ includePrice: true, price: "0" }).price,
    ).toBe(true);
    expect(
      canProceedMarketplaceConfigure({ includePrice: true, price: "49900,50" }),
    ).toBe(true);
  });

  it("parses comma decimal price for API", () => {
    expect(
      parseMarketplacePrice({ includePrice: true, price: "123,50" }),
    ).toBe(123.5);
  });
});
