# Stage 4 — Cloud Vehicle Documents

## Scope

Vehicle documents become cloud-first. Supabase Storage keeps the private original,
PostgreSQL keeps metadata, and the existing filesystem/SQLite copy remains a local
cache. Service-entry attachments stay local in this stage.

## Data flow

1. The client accepts PDF, JPEG, PNG, or WebP and checks its byte size.
2. It saves the existing local copy and metadata first.
3. It creates an `uploading` metadata row scoped to an owned vehicle.
4. Storage Policies allow the object only when that exact metadata row exists.
5. A successful upload changes the row to `ready`; interrupted uploads retry when
   the document list is loaded.
6. Local-only documents are migrated with their existing IDs and are not deleted.

The bucket enforces a 20 MB hard ceiling and allowed MIME types. Images additionally
have a 10 MB client limit. The 10-page PDF and 25-megapixel limits require file
inspection and remain part of the indexing/vision boundary rather than trusting
client metadata.

## Privacy and retention

- Uploading stores the document for the account; it does not grant AI access.
- A later chat flow must explicitly select documents before AI processing.
- A document is retained until the user deletes it, its vehicle, or the account.
- Deletion removes the Storage object before database metadata.
- Incomplete uploads older than 24 hours are removed by `retention-cleanup`.
- Private documents never use public URLs; cross-device opening uses a 60-second
  signed URL and a temporary cache file.
- Export is available through the platform share sheet.

## Security invariants

- RLS derives ownership from the authenticated session and the vehicle relation.
- Storage paths contain opaque IDs, not document names or vehicle identifiers such
  as VIN or registration number.
- Storage access requires an exact metadata-row/path match.
- The backend must treat document bytes and extracted content as untrusted.
- Stage 5 must validate PDF structure and page count before parsing.

