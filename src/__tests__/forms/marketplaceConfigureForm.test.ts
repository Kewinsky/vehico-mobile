import {
  canProceedMarketplaceConfigure,
  marketplaceConfigureFieldErrors,
  marketplacePriceForNavigation,
} from "../../forms/marketplaceConfigureForm";

describe("marketplaceConfigureForm", () => {
  it("allows proceeding without price when option is off", () => {
    expect(canProceedMarketplaceConfigure({ includePrice: false, price: "" })).toBe(
      true,
    );
  });

  it("requires a positive integer price when option is on", () => {
    expect(
      canProceedMarketplaceConfigure({ includePrice: true, price: "" }),
    ).toBe(false);
    expect(
      marketplaceConfigureFieldErrors({ includePrice: true, price: "0" }).price,
    ).toBe(true);
    expect(
      canProceedMarketplaceConfigure({ includePrice: true, price: "123,50" }),
    ).toBe(false);
    expect(
      canProceedMarketplaceConfigure({ includePrice: true, price: "49900" }),
    ).toBe(true);
  });

  it("parses integer price for navigation", () => {
    expect(
      marketplacePriceForNavigation({ includePrice: true, price: "49900" }),
    ).toBe(49900);
  });
});
