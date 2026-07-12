import { donutSlicePath } from "../../screens/header/vehicleDashboard/stats/charts/chartGeometry";

describe("donutSlicePath", () => {
  it("returns a path for a full ring (100% single slice)", () => {
    const path = donutSlicePath(100, 100, 90, 50, -Math.PI / 2, (3 * Math.PI) / 2);
    expect(path).toContain("A");
    expect(path.length).toBeGreaterThan(20);
  });
});
