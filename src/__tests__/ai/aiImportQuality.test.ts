import {
  countAiImportCorrections,
  countAiImportStatuses,
  recordAiImportQuality,
} from "../../services/ai/aiImportQuality";
import { supabase } from "../../test/supabaseMock";

describe("AI import quality metrics", () => {
  it("counts all field states and user corrections", () => {
    expect(
      countAiImportStatuses([
        "recognized",
        "recognized",
        "uncertain",
        "missing",
        "rejected",
      ]),
    ).toEqual({ recognized: 2, uncertain: 1, missing: 1, rejected: 1 });
    expect(countAiImportCorrections(["a", 1, null], ["a", 2, "x"])).toBe(2);
  });

  it("records only content-free counters", async () => {
    supabase.rpc.mockResolvedValue({ data: { recorded: true }, error: null });

    await recordAiImportQuality({
      feature: "fuel_receipt_import",
      requestId: "ai_request_123456",
      statusCounts: { recognized: 3, uncertain: 1, missing: 1, rejected: 0 },
      correctionCount: 2,
      categoryCorrectionCount: 0,
    });

    expect(supabase.rpc).toHaveBeenCalledWith("record_ai_import_quality", {
      p_feature: "fuel_receipt_import",
      p_request_id: "ai_request_123456",
      p_recognized_fields: 3,
      p_uncertain_fields: 1,
      p_missing_fields: 1,
      p_rejected_fields: 0,
      p_correction_count: 2,
      p_category_correction_count: 0,
    });
  });
});
