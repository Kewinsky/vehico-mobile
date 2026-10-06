# AI Stage 5 – Fuel Receipt Import

## Scope

Stage 5 adds an AI-assisted import to the existing new fueling-entry form. The
user can take a photo or select a JPG, JPEG, PNG, HEIC, or HEIF image. HEIC and
HEIF files are converted to a temporary JPEG before analysis. The original file
is not changed.

The receipt is sent in one authenticated request to the
`fuel-receipt-import` Edge Function. The file is used only for that request and
is not stored in Supabase Storage or in the database.

## User flow

1. Open the new fueling-entry form and select **Import fuel receipt**.
2. Choose the camera, photo library, or files.
3. Wait for the estimated progress indicator. Analysis starts immediately
   after selecting the image.
4. Review and correct the populated date, fuel amount, cost, fuel type, and
   station.
5. Enter the distance manually.
6. Save the entry using the normal form action.

The model never creates or saves a fueling entry. Editing an existing entry does
not show the import action.

## Extraction contract

The structured response contains:

- date,
- fuel amount,
- total cost,
- fuel grade,
- gas station.

Every field has a status: `recognized`, `uncertain`, or `missing`. Values are
copied exactly as read, without currency or unit conversion. Currency and fuel
unit come only from the user's application settings and are used as form
labels. Distance is not part of the extraction contract and is always entered
by the user.

## Security and limits

- A verified Supabase session and Premium access are required.
- The backend checks vehicle ownership before calling the model.
- The backend reads the owned vehicle's fuel type and rejects an incompatible
  fuel-grade suggestion.
- Unknown station brands map to `other`.
- Only JPEG and PNG reach the backend; HEIC and HEIF are converted locally.
- The decoded input is limited to 10 MB.
- Model execution is limited to 30 seconds and 1,200 output tokens.
- Requests use `store: false`.
- Receipt content and model output are treated as untrusted input.
- Non-fuel products are excluded from extracted totals.

## Verification

Deterministic tests cover authentication, ownership, MIME signatures, malformed
model output, allowed fuel grades, unknown stations, missing fields, direct value
copying, and the manual-distance requirement.

No database migration is required for this stage.
