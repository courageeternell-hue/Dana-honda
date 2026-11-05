# Honda Sales Mobile

Native Android-first application built with React Native, Expo Router and TypeScript. This is a separate native mobile codebase, not a WebView wrapper around the Next.js website.

## Expo project

- Expo account owner: `ichatasya`
- EAS project ID: `fd9bfa1d-db87-406f-8e61-7b053dbc0c45`
- Android application ID: `com.danz.hondasales`
- Manual APK profile: `preview` in `eas.json`

The EAS project ID is already present in `app.json`. Do not run `eas build:configure` again unless Expo specifically reports that the project is not linked.

## Supabase configuration

The app connects to the existing `honda-sales-report` Supabase project (`hgvlzgpcxetyoroqrjwj`). The mobile app reads only these public client variables:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

For an EAS cloud build, add both variables to the Expo project's **preview** environment. For local development, copy `.env.example` to `.env` and fill in the same values. Never place a Supabase service-role key or another server secret in this mobile app. Admin-only user provisioning must run on a trusted server/Edge Function.

## Manual Android APK build

Run these commands from the repository's `apps/mobile` directory:

```bash
npm ci
npm run preflight
npx expo-doctor
npm run typecheck
eas whoami
eas project:info
eas build --platform android --profile preview
```

Before building, make sure `eas whoami` shows `ichatasya`, and `eas project:info` points to the project ID above. The final command starts the cloud APK build; run it manually only when the checks above pass.

If EAS CLI is not installed on the machine, install it with `npm install --global eas-cli`, then sign in using `eas login`.

## Build profiles

- `preview`: internal Android APK for direct device installation.
- `production`: Android App Bundle (AAB) for store release.
- `development`: internal APK with a development client.

## Implemented in the current branch

- Native Expo Router tabs: Beranda, Prospek, SPK, Profil
- Supabase email/password login with persisted sessions and mobile foreground/background token refresh
- Profile lookup, active-account check and roles: admin, supervisor, sales
- Sales Prospek CRUD screen with required-field validation and delete confirmation
- SPK CRUD screen with status validation and delete confirmation
- Monthly dashboard aggregates from Supabase
- Role-gated Admin/Supervisor dashboard entry from Profil
- Android build profiles for internal APK and production AAB

## Still required before release

- Complete Admin/Supervisor team dashboard and user-management workflows
- Secure server-side account provisioning (never expose service-role credentials in the app)
- Successful Expo Doctor and TypeScript checks
- A successful EAS Android cloud build and physical-device testing
- Test login, role access, CRUD, RLS behavior and navigation on Android devices
- Privacy information and production release checks

The source code is committed, but no APK/AAB has been built or device-tested yet.
