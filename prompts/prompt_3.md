Continue development of the existing Vehico mobile application.

This phase focuses on usability fixes, full CRUD completion, navigation cleanup, and UX consistency.
NO new core features should be added.
ONLY improve and complete existing functionality.

---

## GOALS OF THIS PHASE

- Fix UX friction and mobile interaction issues
- Complete full CRUD for all existing entities
- Improve navigation clarity and information architecture
- Increase user sense of control over their data
- Polish Vehico as a production-ready app

---

## SMALL UX & COPY IMPROVEMENTS

### 1. Correct Title Placeholder for Motorcycles

- When creating or editing a motorcycle:
  - Use a motorcycle-specific title placeholder
  - Example:
    - Car: "BMW 530d 2019"
    - Motorcycle: "Yamaha MT-07 2020"
- Do NOT reuse car placeholders for motorcycles

---

### 2. Input Focus & Scroll Behavior (IMPORTANT)

- User must be able to:
  - Scroll the screen while an input is focused
  - Dismiss the keyboard by tapping outside the input area
- Implement:
  - KeyboardAvoidingView
  - Proper ScrollView behavior
  - TouchableWithoutFeedback or equivalent to blur inputs
- This must work consistently on both iOS and Android

---

## SETTINGS PAGE (REQUIRED)

Implement a full Settings screen.

Settings include:

- Currency (PLN, EUR)
- Distance unit (km / miles)
- Fuel unit (liters / gallons)
- Theme:
  - System
  - Light
  - Dark
- Language:
  - English
  - Polish

Requirements:

- Persist settings per user
- Apply settings immediately where applicable
- Use existing design system (monochrome + accent #FFB803)

---

## FULL CRUD IMPLEMENTATION (CRITICAL)

Currently, many entities support only CREATE or READ.
This phase must implement FULL CRUD (Create, Read, Update, Delete).

### Entities requiring full CRUD:

#### 1. Vehicles

- Create
- Read
- Update (edit vehicle details)
- Delete (soft delete)

#### 2. Service Entries

- Create
- Read
- Update (edit service entry)
- Delete

#### 3. Fueling Entries

- Create
- Read
- Update
- Delete

#### 4. Expense Entries

- Create
- Read
- Update
- Delete

#### 5. Documents / Attachments

- Upload
- View
- Remove (delete attachment)

#### 6. Reminders

- Create
- Read
- Update
- Delete

Deletion rules:

- Use soft delete where applicable
- Immediate UI feedback after deletion
- No orphaned records

---

## ATTACHMENT MANAGEMENT

- User must be able to:
  - Remove uploaded attachments (images, documents)
- Removal must:
  - Delete reference from database
  - Remove file from Supabase Storage
- UI must clearly indicate destructive actions (confirmation dialog)

---

## NAVIGATION & INFORMATION ARCHITECTURE FIXES

### 1. Public Link Access

- Remove "Generate Public Link" action from:
  - Service History page
- Public link generation must be available ONLY as:
  - A dedicated card on the vehicle-specific dashboard

---

### 2. Vehicle-Specific Dashboard Enhancements

On the vehicle dashboard:

Add cards for:

- Service History
- Fuel & Costs
- Documents
- Reminders
- Public Page / Share
- Manage Vehicle

Cards must:

- Use 2-column tile layout
- Be consistent with existing design
- Clearly communicate action purpose

---

### 3. Manage Vehicle Page

Implement a dedicated "Manage Vehicle" screen.

Features:

- Edit vehicle details
- Delete vehicle
- Manage vehicle photos
- Navigate back safely

Access:

- Via a card/shortcut on the vehicle-specific dashboard

---

## HEADER & BRANDING FIX

- Remove dynamic headers showing screen-specific titles
- Always display static app name:
  - "Vehico"
- Header must:
  - Be consistent across all screens
  - Use minimal styling
  - Reinforce brand identity

---

## FULL CRUD FOR SUPPORTING MODULES (ENFORCE)

The following modules must support full functionality.
Currently GET-only behavior is NOT acceptable.

Modules:

- Fuel & Costs
- Documents
- Reminders

Each must support:

- Create
- Edit
- Delete
- Immediate UI refresh

---

## QUALITY & UX REQUIREMENTS

- No dead buttons
- No placeholder actions without feedback
- All destructive actions require confirmation
- Loading, empty, and error states must be handled
- No breaking changes to existing data

---

## NON-GOALS (DO NOT ADD)

- New premium features
- OCR / AI / PDF activation
- Analytics dashboards
- Visual redesign
- New navigation paradigms

---

## DELIVERY EXPECTATIONS

- Vehico must feel complete, predictable, and stable
- All existing features must be fully usable
- UX must be smooth on both iOS and Android
- Code must remain clean and maintainable

This phase is about polish, correctness, and control — not expansion.
