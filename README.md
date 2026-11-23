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

- **Framework**: React Native (0.88) + Expo (~58), New Architecture
- **Language**: TypeScript
- **Navigation**: React Navigation (native stack + native bottom tabs)
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Local data**: expo-sqlite + AsyncStorage (settings, attachments, documents)
- **Payments**: RevenueCat (`react-native-purchases`)
- **Observability**: Sentry (`@sentry/react-native`)
- **i18n**: react-i18next
- **UI**: custom components, Reanimated, Skia (QR), theme provider

## Prerequisites

- Node.js 22.13.0+ on the Node 22 line, or a supported newer even-numbered release (CI uses Node 22)
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
   - Deploy Edge Functions under `supabase/functions/` (`revenuecat-webhook`, `retention-cleanup`, `delete-account`, `generate-marketplace-post`, `vehicle-chat`, `service-invoice-import`, `fuel-receipt-import`)
   - Optional seed scripts: `supabase/seed_data_pl.sql`, `supabase/seed_data_eng.sql`

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
  - On push: deploy Supabase Edge Functions (`revenuecat-webhook`, `retention-cleanup`, `delete-account`, `generate-marketplace-post`, `vehicle-chat`, `service-invoice-import`, `fuel-receipt-import`) using environment `PROD` (main) or `DEV` (other)

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

Local native release (after migrating any existing native project as described below):

```bash
npx expo prebuild --no-clean
npx expo run:ios --configuration Release
npx expo run:android --variant release
```

Ensure production env includes Supabase, reports URL, and RevenueCat keys.

The app uses Expo SDK 58.0.26, React Native 0.88.1, and React 19.3.0. iOS 16.4+
is required. The production iOS EAS profile pins `macos-tahoe-26.6-xcode-27.0`
to build with the iOS 27 SDK. For local release builds, select Xcode 27 as well.

SDK 58 generates `SceneDelegate.swift` and the scene manifest by default and
starts React Native through Expo's scene delegate. No `enableSceneSupport`
option or custom scene plugin is needed.
Build a new native app after upgrading; an update to JavaScript alone is not
enough. Before release, verify cold start, sign-in links, notifications, native
menus, camera/document selection, local SQLite data, and purchases on a device.

`ios.deploymentTarget` is explicitly set to `16.4`. Expo's autolinking installer
raises resource bundle deployment targets to match their owning Pod targets.
There is no local Podfile patch plugin. When upgrading an existing native
project, compare it with the SDK 58 template: the app delegate no longer creates
the window, and the generated scene delegate and manifest must be included in
the Xcode target. `prebuild --no-clean` preserves existing startup files; it does
not migrate them to the new template. Before archiving, migrate those files
manually using the template, or back up local native changes and regenerate the
native project from SDK 58. A fresh EAS build without uploaded native directories
uses the new template automatically. After migrating existing native files,
sync configuration and install Pods:

```bash
npx expo prebuild --platform ios --no-clean --no-install
cd ios
pod install
```

TypeScript is aligned with SDK 58. ESLint config 10 keeps the existing rule set
outside Expo's version alignment; this SDK upgrade does not enable the
additional React Compiler lint rules from newer ESLint configs.

See [Expo build images](https://docs.expo.dev/build-reference/infrastructure/)
and [Expo scene lifecycle guidance](https://github.com/expo/fyi/blob/main/ios-scene-lifecycle.md).

### Premium free trial (store intro offer)

App support is client-side (RevenueCat `periodType`, Shop current-plan card, home banner, local pushes). The native App Store / Play sheet shows the free trial when the store account is eligible. Configure the intro in App Store Connect / Google Play and sync products in RevenueCat. No database migration required.

## Feature Notes

### Premium & limits

Free plan caps vehicles, tires/wheels, workshops, reminders, photos, and some share/marketplace features. Premium unlocks higher/unlimited quotas; downgrade flow locks extra vehicles and schedules retention cleanup. Product IDs live in `shared/payments/iapProducts.ts`.

### Workshop intake

Premium users can enable a per-vehicle QR/link. Workshops submit service entries without an account; owners approve or reject pending entries in-app.

### Marketplace & public reports

Configure what to include (history, fuel stats, equipment, formalities, etc.), then generate a public report URL and/or bilingual marketplace copy via the `generate-marketplace-post` Edge Function.

### AI assistant and document import

The in-app AI assistant uses a privacy-filtered vehicle snapshot. Service document
import can prepare editable service-entry drafts from one photo or PDF. The source
is not stored in Vericar cloud storage and is attached locally after the entry is
saved.

## Development

- TypeScript strict mode, functional components/hooks
- Domain types in `src/types/`; repositories under `src/services/`
- Screens under `src/screens/`; wire routes in `src/app/navigation/RootNavigator.tsx`
- Translations in `src/i18n/resources/` (`en.ts`, `pl.ts`)
- Prefer `npm run precheck` before opening a PR

## License

Proprietary software – see [`LICENSE`](LICENSE). All rights reserved.

## Support

Contact: `support@vericar.pl` (or `EXPO_PUBLIC_SUPPORT_EMAIL`).
