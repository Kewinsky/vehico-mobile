Continue development of Vehico.

This phase activates core monetizable features:

- OCR-assisted service entry creation
- PDF vehicle report generation
- AI-powered marketplace listing generation

---

## OCR IMPLEMENTATION

- Integrate Google Cloud Vision OCR
- OCR is triggered when uploading a receipt/invoice
- OCR extracts raw text only
- Backend parses:
  - date
  - amount
  - vendor name (best effort)
- Prefill service entry form
- User must confirm before saving
- Display disclaimer about OCR accuracy

---

## PDF REPORT GENERATOR

- Server-side HTML → PDF
- Report-style layout
- Includes:
  - vehicle details
  - service history
  - categorized expenses summary
  - selected images
- PDF generation requires successful Stripe payment
- Store generated PDF for reuse

---

## MARKETPLACE POST GENERATOR (AI)

- Generate resale listing text based on:
  - vehicle info
  - service history
  - mileage
- Output optimized for:
  - OLX
  - Facebook Marketplace
- One-click copy
- AI logic abstracted behind service
- add mocks if AI is not available
