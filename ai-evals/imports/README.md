# Import evaluation dataset

`cases.json` contains synthetic, content-free expectations for Polish and English
service invoices and fuel receipts. `fixture` is the stable identifier expected
from the protected evaluation asset store. Real customer files must never be
added to this directory.

A model result file has this shape:

```json
{
  "model": "model-name-and-version",
  "cases": [
    {
      "id": "receipt_pl_petrol_01",
      "fields": {
        "date": { "value": "2026-10-05", "status": "recognized" },
        "fuelAmount": { "value": 40.5, "status": "recognized" }
      }
    }
  ]
}
```

Every case and every expected path must be present. Run one or more result files
through:

```bash
npm run eval:ai-imports -- --predictions result-a.json,result-b.json
```

The command prints comparable metrics and exits with a non-zero status if a
model misses any threshold from `cases.json`.
