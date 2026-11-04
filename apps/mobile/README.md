# Honda Sales Mobile

Native Android-first app built with React Native, Expo Router and TypeScript. This is a separate mobile app, not a WebView wrapper around the Next.js site.

## Supabase project

The app is configured for the existing `honda-sales-report` Supabase project (`hgvlzgpcxetyoroqrjwj`). Copy `.env.example` to `.env` and set the project's **publishable** key. Never put a service-role or secret key in a mobile app.

## Start locally

```bash
npm install
npx expo install --fix
npx expo start
```

## Implemented

- Expo Router native tabs: Beranda, Prospek, SPK, Profil
- Supabase email/password sign-in with persisted session
- Profile/role lookup and inactive-account rejection
- Roles: admin, supervisor, sales
- Role-gated Admin/Supervisor dashboard entry from Profil
- Admin role added to the existing Supabase profile role constraint; existing RLS supervisor helper now includes admin

## Next implementation stages

- Prospek and SPK CRUD screens with validation and confirmation
- Real dashboard aggregates, filters and monthly targets
- User management and audit log screens
- Report export, file uploads and native notifications
- Automated tests, device testing, privacy details and EAS Android production builds

New accounts should be provisioned by an administrator. Public self-registration is intentionally not exposed in the app.
