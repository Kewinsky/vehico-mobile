import {
  aiImportEntryRequestId,
  createAiImportRequestId,
} from "../../services/ai/aiImportIdempotency";

describe("AI import idempotency", () => {
  it("creates database-safe operation and entry keys", () => {
    const requestId = createAiImportRequestId();
    expect(requestId).toMatch(/^ai_[a-z0-9_-]+$/);
    expect(aiImportEntryRequestId(requestId, 2)).toBe(`${requestId}:2`);
  });

  it("rejects invalid entry indexes", () => {
    expect(() => aiImportEntryRequestId("ai_request_123456", -1)).toThrow();
  });
});
