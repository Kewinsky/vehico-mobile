import {
  AI_IMPORT_FIELD_STATUSES,
  isAiImportFieldStatus,
  isAiImportFieldValuePresenceValid,
} from "../../../shared/ai/importContract";

describe("AI import field contract", () => {
  it("defines the four supported statuses", () => {
    expect(AI_IMPORT_FIELD_STATUSES).toEqual([
      "recognized",
      "uncertain",
      "missing",
      "rejected",
    ]);
    expect(AI_IMPORT_FIELD_STATUSES.every(isAiImportFieldStatus)).toBe(true);
    expect(isAiImportFieldStatus("calculated")).toBe(false);
  });

  it.each([
    ["recognized", "value", true],
    ["recognized", null, false],
    ["uncertain", "value", true],
    ["uncertain", null, false],
    ["missing", null, true],
    ["missing", "value", false],
    ["rejected", null, true],
    ["rejected", "value", false],
  ] as const)(
    "validates %s value presence",
    (status, value, expected) => {
      expect(isAiImportFieldValuePresenceValid(status, value)).toBe(expected);
    },
  );
});
