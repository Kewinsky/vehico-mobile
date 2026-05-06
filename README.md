# Vehico

A React Native mobile application for tracking vehicle maintenance, fuel consumption, expenses, and service history. Built with Expo, TypeScript, and Supabase.

## Features

- 🚗 **Vehicle Management**: Add and manage multiple vehicles (cars and motorcycles)
- 📋 **Service History**: Track service entries with categories, dates, mileage, and costs
- ⛽ **Fuel Tracking**: Monitor fuel consumption and costs
- 💰 **Expense Tracking**: Record vehicle-related expenses
- 📅 **Reminders**: Set time- or mileage-based reminders for maintenance
- 📎 **Documents**: Attach photos and documents to vehicles and service entries
- 🌐 **Multi-language**: Support for English and Polish
- 🎨 **Theme Support**: Light and dark mode
- 📊 **Statistics**: View expenses and fuel consumption analytics
- 🔗 **Public Sharing**: Generate public links to share vehicle service history

## Tech Stack

- **Framework**: React Native with Expo (~54.0.32)
- **Language**: TypeScript
- **Navigation**: React Navigation (Native Stack)
- **Backend**: Supabase (PostgreSQL, Storage, Auth)
- **State Management**: React Context API
- **Internationalization**: react-i18next
- **UI Components**: Custom components with theme support

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo (via `npx expo ...`)
- iOS Simulator (for iOS development) or Android Emulator (for Android development)
- Supabase account and project

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

   Edit `.env.local` and add your Supabase credentials:

   ```env
   EXPO_PUBLIC_APP_ENV=development
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
   EXPO_PUBLIC_REPORTS_APP_URL=http://localhost:3000
   ```

4. **Set up Supabase database**
   - Run the SQL schema from `supabase/schema.sql` in your Supabase SQL Editor
   - Create storage buckets for attachments (configured in schema)
   - Set up Row Level Security (RLS) policies (included in schema)

5. **Start the development server**

   ```bash
   npm start
   ```

   Or run on specific platform:

   ```bash
   npm run ios      # iOS
   npm run android  # Android
   npm run web      # Web
   ```

## Project Structure

```
vehico/
├── src/
│   ├── app/                    # App shell (navigation, providers)
│   │   ├── navigation/         # Navigation configuration
│   │   └── providers/          # Context providers (Auth, Settings, i18n)
│   ├── config/                 # Configuration files
│   ├── i18n/                   # Internationalization
│   │   ├── resources/          # Translation files (en.ts, pl.ts)
│   │   └── i18n.ts             # i18n configuration
│   ├── screens/                # Screen components
│   ├── services/               # Data layer (Supabase repositories)
│   │   ├── vehicles/
│   │   ├── serviceEntries/
│   │   ├── fuel/
│   │   ├── expenses/
│   │   ├── reminders/
│   │   ├── attachments/
│   │   └── ...
│   ├── types/                  # TypeScript type definitions
│   └── ui/                     # UI components and theme
│       ├── components/         # Reusable components
│       ├── theme.ts            # Theme configuration
│       └── ThemeProvider.tsx   # Theme context
├── assets/                     # Images, icons, fonts
├── supabase/                   # Database schema and migrations
│   ├── schema.sql              # Complete database schema
│   └── migrations/             # Migration scripts
├── app.json                    # Expo configuration
└── package.json
```

## Available Scripts

- `npm start` - Start Expo development server
- `npm run ios` - Run on iOS simulator
- `npm run android` - Run on Android emulator
- `npm run web` - Run in web browser
- `npm run typecheck` - Run TypeScript type checking
- `npm test` - Run Jest tests
- `npm run test:coverage` - Run Jest with coverage report
- `npm run test:watch` - Run Jest in watch mode

## Testing and CI

- Unit/integration tests use Jest (`jest-expo`) and focus on `src/services`, `src/utils`, and `src/config`.
- Coverage scope is configured in `jest.config.js` (`collectCoverageFrom`) to measure logic-heavy layers rather than UI-only files.
- CI is defined in `.github/workflows/ci.yml` and runs:
  - install (`npm ci`)
  - typecheck (`npm run typecheck`)
  - lint (`npm run lint --if-present`)
  - tests (`npm test -- --ci --runInBand`)
  - coverage (`npm run test:coverage -- --ci --runInBand`)

## Configuration

### Environment Variables

- `EXPO_PUBLIC_APP_ENV`: Environment mode (`development` or `production`)
- `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `EXPO_PUBLIC_REPORTS_APP_URL`: URL for the reports web app (optional)

### App Configuration

Edit `app.json` to customize:

- App name and slug
- Bundle identifier / package name
- Icons and splash screens
- Platform-specific settings

## Database Schema

The application uses Supabase (PostgreSQL) with the following main tables:

- `vehicles` - Vehicle information
- `service_entries` - Service history entries
- `fueling_entries` - Fuel consumption records
- `reminders` - Maintenance reminders
- `photos` - Vehicle photos
- `reports` - Public report snapshots
- `posts` - Marketplace post snapshots
- `workshops` - User workshops
- `tires` / `wheels` - Wheel and tire sets
- `entitlements` - Plan/limits and monetization state
- User preferences (appearance, units, language) — **AsyncStorage** on device (`UserSettingsProvider`), not a Postgres table
- Attachments and vehicle documents — **local-first** (SQLite + file system), not primary Supabase tables

See `supabase/schema.sql` for the complete schema with RLS policies.

## Building for Production

### iOS

1. **Generate native code**

   ```bash
   npx expo prebuild --clean
   ```

2. **Build with EAS (recommended)**

   ```bash
   eas build --platform ios
   ```

3. **Or build locally**
   ```bash
   cd ios
   pod install
   cd ..
   npx expo run:ios --configuration Release
   ```

### Android

1. **Generate native code**

   ```bash
   npx expo prebuild --clean
   ```

2. **Build with EAS (recommended)**

   ```bash
   eas build --platform android
   ```

3. **Or build locally**
   ```bash
   npx expo run:android --variant release
   ```

## Features in Detail

### Vehicle Management

- Add vehicles with detailed information (make, model, year, VIN, etc.)
- Upload profile photos
- Edit and delete vehicles
- Support for cars and motorcycles

### Service History

- Chronological timeline of service entries
- Categories: Maintenance, Repair, Inspection, Upgrade, Other
- Attach documents and photos
- Filter by category, date range, and cost
- Search functionality

### Fuel Tracking

- Record fuel consumption with distance, amount, and cost
- Automatic calculation of fuel efficiency
- Filter by date and cost range
- Monthly/yearly statistics

### Reminders

- Time-based reminders (due date)
- Mileage-based reminders (due at specific mileage)
- Mark as done/active
- Filter and search

### Documents

- Upload vehicle photos
- Attach documents to service entries
- Support for images and files
- Delete with confirmation

### Settings

- Currency selection (PLN, EUR)
- Distance unit (km, miles)
- Fuel unit (liters, gallons)
- Theme (light, dark)
- Language (English, Polish)

## Development

### Code Style

- TypeScript strict mode
- Functional components with hooks
- Custom hooks for data fetching
- Context API for global state

### Adding New Features

1. Add types to `src/types/domain.ts`
2. Create repository in `src/services/`
3. Add screen in `src/screens/`
4. Update navigation in `src/app/navigation/`
5. Add translations to `src/i18n/resources/`

## License

Private project - All rights reserved

## Support

For issues and questions, please contact the development team.

test
