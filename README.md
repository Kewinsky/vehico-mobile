# Vericar

React Native mobile app for vehicle ownership: service history, fuel, reminders, wheels/tires, workshops, public reports, and marketplace listings. Built with Expo, TypeScript, and Supabase.

Display name: **Vericar** · npm/slug/scheme: **vehico** · Current app version: **1.4.0** (iOS build 55 / Android versionCode 12)

## Features

- **Vehicle management** – cars, motorcycles, vans, trucks, campers, trailers, and other; photos, notes, equipment checklist, formalities (OC/AC insurance, inspection)
- **Service history** – categories, mileage, cost, workshops, attachments; pending workshop-submitted entries
- **Fuel tracking** – consumption, cost, stations, efficiency and stats
- **Reminders** – time- and mileage-based, with local push notifications
- **Wheels & tires** – sets, fitted status, seasons/dimensions
- **Workshops** – phonebook plus QR workshop intake (premium) for guest service submissions
- **Public reports** – shareable vehicle report links (web app)
- **Marketplace posts** – AI-assisted listing copy (PL/EN) ready to paste on classifieds
- **Documents & attachments** – local-first files (SQLite + filesystem) tied to vehicles/entries
- **Data portability** – export/import flows
- **Premium (RevenueCat)** – Free vs Premium limits, subscriptions and lifetime, entitlement sync
- **Auth** – email OTP, Apple Sign In, Google; optional Cloudflare Turnstile
- **i18n & theme** – English/Polish, light/dark, units and currency preferences

## Tech Stack

- **Framework**: React Native (0.81) + Expo (~54), New Architecture enabled
- **Language**: TypeScript
- **Navigation**: React Navigation (native stack + native bottom tabs)
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Local data**: expo-sqlite + AsyncStorage (settings, attachments, documents)
- **Payments**: RevenueCat (`react-native-purchases`)
- **Observability**: Sentry (`@sentry/react-native`)
- **i18n**: react-i18next
- **UI**: custom components, Reanimated, Skia (QR), theme provider

## Prerequisites

- Node.js 20+ (CI uses Node 20)
- npm
- Expo CLI / EAS CLI for device builds
- iOS Simulator and/or Android emulator (or physical device with dev client)
- Supabase project
- RevenueCat keys for production builds
- Optional: Cloudflare Turnstile site key for auth CAPTCHA

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd vehico
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp env.example .env.local
   ```

   Required / commonly used values (see `env.example`):

   ```env
   EXPO_PUBLIC_APP_ENV=development
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
   EXPO_PUBLIC_REPORTS_APP_URL=http://localhost:3000
   # Production reports/web: https://www.vericar.pl
   # EXPO_PUBLIC_REVENUECAT_API_KEY=appl_xxx
   # EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_xxx
   # EXPO_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAA...
   # EXPO_PUBLIC_APP_DISPLAY_NAME=Vericar
   # EXPO_PUBLIC_SUPPORT_EMAIL=support@vericar.pl
   ```

   Production builds require at least one RevenueCat API key (`EXPO_PUBLIC_REVENUECAT_API_KEY` and/or `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`).

4. **Set up Supabase**

   - Apply `supabase/schema.sql` (or run migrations under `supabase/migrations/`)
   - Configure storage buckets and RLS (included in schema)
   - Deploy Edge Functions under `supabase/functions/` (`revenuecat-webhook`, `retention-cleanup`, `delete-account`, `generate-marketplace-post`)
   - Optional seed scripts: `supabase/seed.sql`, `seed_data_pl.sql`, `seed_data_eng.sql`

5. **Start the development server**

   ```bash
   npm start
   ```

   Or run a native build:

   ```bash
   npm run ios
   npm run android
   ```

## Project Structure

```
vehico/
├── src/
│   ├── app/                 # Boot, Root, navigation, providers (Auth, Settings, Entitlements)
│   ├── config/              # Env, brand, App Store review helpers
│   ├── constants/           # Vehicle types, equipment presets
│   ├── forms/               # Form models / validation helpers
│   ├── i18n/                # en / pl resources
│   ├── layouts/             # Screen layout shells
│   ├── screens/             # header / modal / onboarding / welcome
│   ├── services/            # Repositories & integrations (Supabase, local, payments, push)
│   ├── types/               # Domain types
│   ├── ui/                  # Theme, components, toasts, prompts
│   ├── utils/               # Formatting, validation, dashboard helpers
│   └── __tests__/           # Jest tests
├── shared/payments/         # Shared IAP product IDs (app + webhook)
├── supabase/                # schema.sql, migrations/, functions/
├── email-templates/         # Hosted email HTML snippets
├── store/google-play/       # Store listing assets
├── assets/ · fonts/
├── app.json · app.config.js # Expo config (+ display name override)
├── eas.json
├── env.example
└── package.json
```

## Available Scripts

| Script | Description |
| --- | --- |
| `npm start` | Expo development server |
| `npm run ios` | Native iOS run (`expo run:ios`) |
| `npm run android` | Native Android run (`expo run:android`) |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm run lint` / `lint:fix` | ESLint via `expo lint` |
| `npm test` | Jest |
| `npm run test:coverage` | Jest with coverage |
| `npm run test:watch` | Jest watch mode |
| `npm run precheck` | typecheck + lint + tests (local gate) |

## Testing and CI

- Tests use Jest (`jest-expo`); coverage focuses on `src/services`, `src/utils`, and `src/config` (`jest.config.js`).
- GitHub Actions (`.github/workflows/ci.yml`) on `main` / `develop` and PRs:
  - `npm ci` → typecheck → lint → tests → coverage
  - On push: deploy Supabase Edge Functions (`revenuecat-webhook`, `retention-cleanup`, `delete-account`, `generate-marketplace-post`) using environment `PROD` (main) or `DEV` (other)

## Configuration

### Environment variables

| Variable | Purpose |
| --- | --- |
| `EXPO_PUBLIC_APP_ENV` | `development` or `production` |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `EXPO_PUBLIC_REPORTS_APP_URL` | Public reports / web app base URL |
| `EXPO_PUBLIC_REVENUECAT_API_KEY` | RevenueCat iOS (or shared test) key |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` | RevenueCat Android key (falls back to iOS key) |
| `EXPO_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile public site key |
| `EXPO_PUBLIC_APP_DISPLAY_NAME` | Optional home-screen / permission string name |
| `EXPO_PUBLIC_SUPPORT_EMAIL` | Support address (default `support@vericar.pl`) |

Runtime validation lives in `src/config/env.ts`.

### App / EAS

- Expo app config: `app.json` + `app.config.js` (display name from `app-brand.js`)
- Bundle IDs: `com.ktasoftware.vehico`
- EAS profiles: `development` (dev client), `preview`, `production` (`eas.json`)

## Database Schema

Main Postgres tables (see `supabase/schema.sql` + migrations):

- `vehicles`, `vehicle_equipment`
- `service_entries`, `mileage_audit`
- `fueling_entries`, `reminders`, `photos`
- `workshops`, workshop intake / rate-limit helpers
- `tires`, `wheels`
- `reports`, `posts` (public report / marketplace snapshots)
- `entitlements` (plan limits & monetization state)

Not primary Supabase tables:

- User preferences (appearance, units, language) – **AsyncStorage** via `UserSettingsProvider`
- Attachments and vehicle documents – **local-first** (SQLite + filesystem)

## Building for Production

Prefer EAS:

```bash
eas build --platform ios
eas build --platform android
eas submit --platform ios   # when ready
```

Local native release (after prebuild):

```bash
npx expo prebuild --clean
npx expo run:ios --configuration Release
npx expo run:android --variant release
```

Ensure production env includes Supabase, reports URL, and RevenueCat keys.

### Premium free trial (store intro offer)

App support is client-side (RevenueCat `periodType`, Shop copy, home banner, local pushes). Configure the 14-day free trial in App Store Connect / Google Play and sync products in RevenueCat – see **[docs/premium-trial-setup.md](docs/premium-trial-setup.md)**. No database migration required.

## Feature Notes

### Premium & limits

Free plan caps vehicles, tires/wheels, workshops, reminders, photos, and some share/marketplace features. Premium unlocks higher/unlimited quotas; downgrade flow locks extra vehicles and schedules retention cleanup. Product IDs live in `shared/payments/iapProducts.ts`.

### Workshop intake

Premium users can enable a per-vehicle QR/link. Workshops submit service entries without an account; owners approve or reject pending entries in-app.

### Marketplace & public reports

Configure what to include (history, fuel stats, equipment, formalities, etc.), then generate a public report URL and/or bilingual marketplace copy via the `generate-marketplace-post` Edge Function.

### AI assistant

In-app menu includes an **AI assistant** placeholder (coming soon); marketplace listing generation already uses server-side generation.

## Development

- TypeScript strict mode, functional components/hooks
- Domain types in `src/types/`; repositories under `src/services/`
- Screens under `src/screens/`; wire routes in `src/app/navigation/RootNavigator.tsx`
- Translations in `src/i18n/resources/` (`en.ts`, `pl.ts`)
- Prefer `npm run precheck` before opening a PR

## License

Private project – All rights reserved

## Support

Contact: `support@vericar.pl` (or `EXPO_PUBLIC_SUPPORT_EMAIL`).
