# Honda Sales Mobile

Native Android-first application built with React Native, Expo Router and TypeScript. This is a separate native mobile codebase, not a WebView wrapper around the Next.js website.

## Supabase configuration

The app connects to the existing `honda-sales-report` Supabase project (`hgvlzgpcxetyoroqrjwj`). Copy `.env.example` to `.env` and set the project's **publishable** key.

Never place a Supabase service-role key or other server secret in this mobile app. Admin-only user provisioning must be implemented on a trusted server/Edge Function.

## Local development

Use Node.js 22.13 or newer for Expo SDK 58.

```bash
npm install
npx expo install --fix
npx expo-doctor
npx expo start
```

## Android builds

EAS profiles are defined in `eas.json`:

- Internal preview APK: `eas build --platform android --profile preview`
- Production Android App Bundle: `eas build --platform android --profile production`

Before the first cloud build, sign in to an Expo account and link this app to an EAS project with `eas build:configure`. Configure the two `EXPO_PUBLIC_SUPABASE_*` environment variables in the EAS project environment. Only the publishable key belongs in the client.

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
- Run dependency validation, TypeScript checks and a real Android cloud build
- Test login, role access, CRUD, RLS behavior and navigation on physical Android devices
- Add app icon/splash assets, privacy information and production release checks

The source code is committed, but no APK/AAB has been built or device-tested yet.
