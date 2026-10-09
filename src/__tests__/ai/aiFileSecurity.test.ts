/** @jest-environment node */

import {
  inspectPdfSecurity,
  MAX_SERVICE_PDF_PAGES,
} from "../../../supabase/functions/_shared/aiFileSecurity";

function pdf(contents: string): string {
  return Buffer.from(`%PDF-1.7\n${contents}\n%%EOF`).toString("base64");
}

describe("AI PDF security", () => {
  it("accepts a bounded passive PDF", () => {
    expect(inspectPdfSecurity(pdf("1 0 obj <</Type /Page>> endobj"))).toEqual({
      safe: true,
      pageCount: 1,
    });
  });

  it.each(["/JavaScript", "/Launch", "/EmbeddedFile", "/OpenAction"])(
    "rejects active PDF token %s",
    (token) => {
      expect(
        inspectPdfSecurity(
          pdf(`1 0 obj <</Type /Page /AA << ${token} 2 0 R >>>> endobj`),
        ),
      ).toEqual({ safe: false, reason: "active_content" });
    },
  );

  it("rejects PDFs over the page limit and malformed payloads", () => {
    expect(
      inspectPdfSecurity(
        pdf(`<</Type /Pages /Count ${MAX_SERVICE_PDF_PAGES + 1}>>`),
      ),
    ).toEqual({ safe: false, reason: "too_many_pages" });
    expect(inspectPdfSecurity(Buffer.from("%PDF-no-eof").toString("base64"))).toEqual({
      safe: false,
      reason: "malformed",
    });
  });
});
