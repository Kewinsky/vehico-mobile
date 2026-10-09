import type { AiImportFieldStatus } from "../../../shared/ai/importContract";
import { supabase } from "../supabase/client";

export type AiImportStatusCounts = Record<AiImportFieldStatus, number>;

export function countAiImportStatuses(
  statuses: readonly AiImportFieldStatus[],
): AiImportStatusCounts {
  const counts: AiImportStatusCounts = {
    recognized: 0,
    uncertain: 0,
    missing: 0,
    rejected: 0,
  };
  for (const status of statuses) counts[status] += 1;
  return counts;
}

export function countAiImportCorrections(
  baseline: readonly unknown[],
  finalValues: readonly unknown[],
): number {
  const length = Math.max(baseline.length, finalValues.length);
  let corrections = 0;
  for (let index = 0; index < length; index += 1) {
    if (JSON.stringify(baseline[index]) !== JSON.stringify(finalValues[index])) {
      corrections += 1;
    }
  }
  return corrections;
}

export async function recordAiImportQuality(input: {
  feature: "service_invoice_import" | "fuel_receipt_import";
  requestId: string;
  statusCounts: AiImportStatusCounts;
  correctionCount: number;
  categoryCorrectionCount: number;
}): Promise<void> {
  try {
    await supabase.rpc("record_ai_import_quality", {
      p_feature: input.feature,
      p_request_id: input.requestId,
      p_recognized_fields: input.statusCounts.recognized,
      p_uncertain_fields: input.statusCounts.uncertain,
      p_missing_fields: input.statusCounts.missing,
      p_rejected_fields: input.statusCounts.rejected,
      p_correction_count: input.correctionCount,
      p_category_correction_count: input.categoryCorrectionCount,
    });
  } catch {
    // Quality telemetry is best-effort and must never block a confirmed save.
  }
}
