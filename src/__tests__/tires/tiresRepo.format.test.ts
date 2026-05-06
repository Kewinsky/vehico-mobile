import { formatTireDimensions } from "../../services/tires/tiresRepo";

describe("formatTireDimensions", () => {
  it("formats standard notation", () => {
    expect(formatTireDimensions(225, 45, 17)).toBe("225/45 R17");
  });
});
