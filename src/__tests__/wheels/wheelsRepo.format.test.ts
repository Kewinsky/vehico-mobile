import { formatWheelDimensions } from "../../services/wheels/wheelsRepo";

describe("formatWheelDimensions", () => {
  it("formats J and diameter", () => {
    expect(formatWheelDimensions(8, 18)).toBe("8J R18");
  });
});
