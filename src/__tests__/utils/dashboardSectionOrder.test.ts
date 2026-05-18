import {
  normalizeSectionOrder,
  sectionOrdersEqual,
} from "../../utils/dashboardSectionOrder";

const DEFAULT = ["a", "b", "c", "d"] as const;

describe("normalizeSectionOrder", () => {
  it("returns defaults when stored is missing or invalid", () => {
    expect(normalizeSectionOrder(DEFAULT, undefined)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
    expect(normalizeSectionOrder(DEFAULT, null)).toEqual(["a", "b", "c", "d"]);
    expect(normalizeSectionOrder(DEFAULT, "x")).toEqual(["a", "b", "c", "d"]);
  });

  it("applies stored order and appends new default sections", () => {
    expect(normalizeSectionOrder(DEFAULT, ["c", "a"])).toEqual([
      "c",
      "a",
      "b",
      "d",
    ]);
  });

  it("drops unknown and duplicate ids", () => {
    expect(
      normalizeSectionOrder(DEFAULT, ["b", "x", "b", "d", "a"]),
    ).toEqual(["b", "d", "a", "c"]);
  });
});

describe("sectionOrdersEqual", () => {
  it("compares order-sensitive arrays", () => {
    expect(sectionOrdersEqual(["a", "b"], ["a", "b"])).toBe(true);
    expect(sectionOrdersEqual(["a", "b"], ["b", "a"])).toBe(false);
    expect(sectionOrdersEqual(["a"], ["a", "b"])).toBe(false);
  });
});
