# Lifestyle OS Mobile (Expo)

This workspace contains the iOS/Android app shell for Lifestyle OS.

## What is implemented

- Expo app scaffold for iOS and Android
- Bottom-tab navigation shell (Dashboard, Capture, Cycles, Settings)
- Secure token storage with `expo-secure-store`
- Google OAuth session start against existing API (`/api/auth/google/start`)
- Shared business logic consumption from `@lifestyle-os/shared`

## Run the mobile app

From repository root:

```bash
npm install
npm run mobile
```

Then press:

- `i` for iOS simulator
- `a` for Android emulator

Or run directly:

```bash
npm run mobile:ios
npm run mobile:android
```

## Environment

Set `EXPO_PUBLIC_API_URL` for the mobile app API base.

Examples:

- iOS simulator: `http://localhost:4000/api`
- Android emulator: `http://10.0.2.2:4000/api`
- Physical device: `http://<your-lan-ip>:4000/api`

Use a custom scheme redirect (`lifestyleos://auth/callback`) for standalone app builds.
