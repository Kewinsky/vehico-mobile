Continue development of Vehico.

This phase focuses on usability, discoverability, and productivity.
NO monetization logic should be added or changed.

---

## SERVICE ENTRY CATEGORIES

- Add category field to service entries:
  - maintenance
  - repair
  - inspection
  - upgrade
  - other
- Category is required
- Used for filtering and summaries

---

## SERVICE HISTORY FILTERING

Implement filters:

- By category
- By date range
- By cost range (optional)

Filters must:

- Be client-side
- Resettable
- Non-destructive

---

## SERVICE HISTORY SEARCH

- Text search across:
  - title
  - description
- Instant feedback
- Case-insensitive

---

## REMINDERS IMPROVEMENTS

- Add optional notes field to reminders
- Reminders must appear:
  - in dedicated Reminders screen
  - inline in service history timeline (visually distinct)

---

## UX RULES

- No new navigation layers
- No clutter
- Filters and search must not overwhelm the UI
