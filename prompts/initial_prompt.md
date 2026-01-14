Build a production-ready mobile application called "Vehico".

Vehico is a minimalist, document-focused mobile app that allows users to create a trusted ownership and maintenance history for cars and motorcycles, and generate professional public reports (public link + PDF), primarily for resale purposes.

The application must be built with:

- React Native (Expo, TypeScript)
- Supabase (PostgreSQL, Auth, Storage, Row Level Security)
- Stripe for payments
- Google Cloud Vision for OCR
- Server-side PDF generation
- AI text generation for resale listings (abstracted service)
- React-i18next for internationalization

Any docs can be found under `/docs` folder.

The solution must be optimized for a solo founder: simple architecture, clean code, no overengineering.

---

## CORE PRODUCT VISION

Vehico is not a vehicle management or tracking app.
Vehico is a "proof of care" generator for cars and motorcycles.

The product helps owners prove that a vehicle was properly maintained by presenting a clean, verifiable service history with supporting documents.

Primary use case:

- Preparing a car or motorcycle for resale by generating trust and transparency.

---

## SUPPORTED VEHICLE TYPES

- Car
- Motorcycle

No other vehicle types should be supported in v1.

---

## SUPPORTED LANGUAGES

- English (EN)
- Polish (PL)
- Architecture must support easy future language expansion (i18n-ready).

---

## CORE FEATURES (MVP)

### 1. Authentication

- Email magic link authentication (Supabase Auth)
- OAuth (Apple / Google) optional but supported
- One user can own multiple vehicles

---

### 2. Vehicle Management

Users can create and manage vehicles.

Vehicle fields:

- id
- owner_id
- type (car | motorcycle)
- title (free text, e.g. "BMW 530d 2019")
- vin (optional but recommended)
- make
- model
- production_year
- created_at

Vehicles must be fully isolated per user using Row Level Security.

---

### 3. Service / History Entries

Each vehicle has a chronological, immutable service timeline.

Entry fields:

- id
- vehicle_id
- service_date
- mileage (optional)
- title
- description
- cost (optional)
- created_at

Users can:

- Add service entries manually
- Upload documents to assist entry creation

Timeline UI must feel document-like, chronological, and trustworthy.

---

### 4. OCR-Assisted Document Upload

- User uploads an image (receipt / invoice)
- Image is stored in Supabase Storage
- Google Cloud Vision OCR extracts raw text
- Backend processes OCR output
- Service entry form is prefilled with extracted data
- User MUST review and confirm before saving
- Display a disclaimer that OCR data may be inaccurate

OCR logic must be abstracted behind a service layer.

---

### 5. Attachments

- Attachments belong to service entries
- Stored in Supabase Storage
- Types:
  - receipt
  - invoice
  - photo
- Attachments are visible in public view (read-only)

---

### 6. Public Shareable Vehicle Page (CRITICAL FEATURE)

Each vehicle can generate a public, read-only page.

Public page requirements:

- Unique, unguessable public ID
- No authentication required
- Not indexed by search engines (noindex)
- Read-only access only
- Displays:
  - Vehicle summary
  - Full service history timeline
  - Attached documents and photos

Public pages must be accessible via a standard web browser.

---

### 7. PDF Vehicle Report Generation (PAID FEATURE)

- Server-side generated PDF
- Professional, report-style layout
- Print-ready format
- PDF includes:
  - Vehicle details
  - Chronological service history
  - Selected photos
- PDF is generated on demand
- Payment required before generation

PDF generation must be implemented server-side (HTML → PDF).

---

### 8. AI-Powered Resale Listing Generator (PAID, OPTIONAL)

- Generates a resale listing description based on:
  - Vehicle data
  - Service history
- Output optimized for:
  - OLX
  - Facebook Marketplace
- One-click copy to clipboard
- AI logic must be abstracted behind a service layer

---

### 9. Notifications (Basic Only)

- Simple reminders (e.g. upcoming service)
- Email or push notifications
- No complex scheduling or analytics

---

## MONETIZATION

- Payments handled via Stripe
- One-time payments only (no subscriptions)

Paid features:

- PDF vehicle report generation
- OCR document processing
- AI resale listing generation

Stripe integration must be modular and extensible.

---

## DESIGN & UI SYSTEM

Design language:

- Minimalist
- Square-based layouts
- Monochromatic color palette (black / white / grayscale)
- Single accent color: #FFB803
- Flat design
- Large, readable typography
- Calm, professional, document-oriented feeling

UI characteristics:

- No charts
- No dashboards
- Timeline-based service history view
- Subtle animations only
- Strong focus on readability and trust

---

## TECHNICAL REQUIREMENTS

### Backend (Supabase)

Tables:

- users
- vehicles
- service_entries
- attachments
- public_pages
- payments

Row Level Security:

- Users can only access their own vehicles and data
- Public pages are strictly read-only

Storage buckets:

- images
- documents

Server-side logic:

- OCR processing
- PDF generation
- AI content generation
- Stripe webhook handling

---

### Frontend

- React Native (Expo)
- TypeScript
- Clean, modular folder structure
- Reusable UI components
- Proper loading, error, and empty states
- Graceful handling of poor connectivity (no full offline mode)

---

## NON-GOALS (DO NOT BUILD)

- Workshop management systems
- Fuel consumption analytics
- Fleet management
- Subscriptions
- Social features
- Marketplaces
- Advanced dashboards
- IoT or telemetry integrations

---

## DELIVERY EXPECTATIONS

- Fully working React Native application
- Supabase schema with RLS policies
- Public web pages for shared vehicles
- Stripe payment flow
- Clean, maintainable codebase
- Focused MVP ready for real users and monetization

Vehico must feel like a digital vehicle service document, not a lifestyle app.
