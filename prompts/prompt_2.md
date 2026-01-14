Continue development of the existing Vehico mobile application.

This phase focuses on improving usability, retention, and data ownership, while keeping Vehico a focused, document-first app for cars and motorcycles.

DO NOT change the core product vision.
DO NOT add marketplace, social, or workshop features.
All new features must integrate cleanly with the existing architecture.

---

## GOALS OF THIS PHASE

- Improve day-to-day usability
- Add lightweight tracking features (costs, fueling)
- Give users control over their data
- Improve UX polish and clarity
- Prepare UI for future paid features without enabling them yet

---

## NEW FEATURES TO IMPLEMENT

### 1. Fueling & Cost Tracking (LIGHTWEIGHT)

Add optional tracking modules separate from service history.

#### Fueling Entries

Fields:

- id
- vehicle_id (dropdown)
- date
- distance
- fuel_amount
- fuel_cost
- created_at

Features:

- Manual entry only
- Simple validation
- Linked to vehicle

#### Expense Entries

Fields:

- id
- vehicle_id (dropdown)
- date
- category (service, parts, insurance, other)
- amount
- note (optional)
- created_at

#### Statistics (Minimal)

- Total cost per vehicle
- Monthly cost summary
- Average fuel consumption
- Cost per kilometer

IMPORTANT:

- No charts in v1
- Display numeric summaries only

---

### 2. Import / Export (Data Ownership)

Implement data portability.

Export:

- Per vehicle
- Formats:
  - JSON (primary)
  - CSV (secondary)
- Includes:
  - vehicle data
  - service entries
  - fueling entries
  - expenses

Import:

- CSV only
- Validate schema
- Reject invalid or foreign vehicle IDs
- Manual user confirmation before import

---

### 3. Reminders

Add simple reminder functionality.

Reminder types:

- Time-based (in X days)
- Mileage-based (in X km)

Delivery:

- Email
- Push notifications (Expo)

Logic:

- Simple threshold-based
- No predictive logic
- No automatic service schedules

---

### 4. User Settings

Add a Settings screen.

Settings:

- Currency (PLN, EUR)
- Distance unit (km / miles)
- Fuel unit (liters / gallons)
- Theme:
  - system
  - light
  - dark
- Language:
  - English
  - Polish

Settings must persist per user.

---

### 5. Deletion & Data Control

Add full user control over data.

- Delete vehicle (soft delete)
- Delete service entries
- Delete fueling entries
- Delete expense entries
- Delete uploaded images/documents

Implement:

- Soft delete with restore window (e.g. 30 days)
- Permanent deletion after grace period

---

### 6. Media Improvements

Enhance image handling.

- Fullscreen image preview
- Pinch-to-zoom
- Swipe navigation
- Image viewer modal

Allow:

- Adding vehicle photos (separate from service attachments)
- Vehicle photos used in:
  - public page
  - PDF reports (future)

---

### 7. UI & Navigation Enhancements

#### Tile-Based Vehicle Dashboard

Implement a 2-column tile layout per vehicle.

Tiles:

- Service History
- Fuel & Costs
- Documents
- Reminders
- Report (disabled)
- AI Listing (disabled)

Disabled tiles:

- Must be visible
- Must show a clear informational message:
  “This feature is not available yet.”

DO NOT show “coming soon”.

---

### 8. Feature Availability Messaging

For features not yet implemented (OCR, AI listing, PDF):

When accessed:

- Show a clear, calm informational message:
  “This feature is currently unavailable.
  We are validating it before release.”

No fake CTAs.
No upsell yet.

---

## BACKEND REQUIREMENTS

Add new tables:

- fueling_entries
- expense_entries
- reminders
- user_settings

Update RLS policies:

- Strict per-user isolation
- Vehicle ownership validation

Extend existing services:

- Notification service
- Export service
- Import validation service

---

## FRONTEND REQUIREMENTS

- Maintain existing design system
- Keep monochromatic style with accent color #FFB803
- Extend existing components where possible
- No new visual paradigms

UX principles:

- Calm
- Predictable
- Document-like
- No clutter

---

## NON-GOALS (DO NOT ADD)

- Charts or analytics dashboards
- Smart recommendations
- Vehicle health scoring
- Workshop or mechanic features
- Social sharing
- Gamification
- Ads

---

## QUALITY REQUIREMENTS

- All new features must be optional
- App must remain usable without tracking enabled
- Code must be clean, readable, and maintainable
- No breaking changes to existing data

Vehico must remain a trusted vehicle history document, not a lifestyle or tracking app.
