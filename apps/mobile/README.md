# Honda Sales Mobile

Native Android-first app built with React Native, Expo and TypeScript. This is a separate mobile app workspace; it does not wrap the existing Next.js website in a WebView.

## Start locally

From this directory:

```bash
npm install
npx expo install --fix
npx expo start
```

## Current scaffold

- Native Expo Router bottom tabs: Beranda, Prospek, SPK, Profil
- Purple/white mobile UI foundation
- Placeholder profile menu for role-gated Admin/Supervisor dashboard
- Supabase dependency included; credentials and database policies are not configured yet

## Release work still required

1. Confirm and configure the existing Supabase project and schema.
2. Implement secure Supabase Auth, role resolution and row-level security.
3. Implement CRUD for Prospek and SPK, including role-based deletion and audit logs.
4. Add report/export, file upload and native notifications.
5. Add automated tests, device testing, privacy details and EAS Android production builds.

Never put a Supabase service-role key in the mobile app. Only a publishable/anon key may be shipped, with strict RLS policies enabled.
