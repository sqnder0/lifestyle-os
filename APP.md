# Publish Guide: Lifestyle OS Mobile (Beginner-Friendly)

This guide walks you through publishing this app to both stores:

- Apple App Store (iOS)
- Google Play Store (Android)

It assumes you are new to app publishing and starts from zero.

## 1. What You Are Publishing

This repository already contains a mobile app built with Expo SDK 54 in [apps/mobile](apps/mobile).

The most important files for publishing are:

- Mobile app config: [apps/mobile/app.json](apps/mobile/app.json)
- Mobile package scripts: [apps/mobile/package.json](apps/mobile/package.json)
- Build profiles: [eas.json](eas.json)
- Root scripts/workspaces: [package.json](package.json)
- Environment variables: [.env.example](.env.example)
- Backend API server: [server/index.js](server/index.js)
- Privacy policy draft: [docs/privacy-policy.md](docs/privacy-policy.md)
- Terms draft: [docs/terms-of-service.md](docs/terms-of-service.md)

## 2. Accounts You Must Create First

You need all of these before final submission:

1. Expo account
- Sign up at https://expo.dev

2. Apple Developer Program account
- Paid account required for App Store release
- Cost is annual

3. Google Play Console account
- One-time registration fee

4. Google Cloud OAuth credentials
- Needed because app auth uses Google sign-in

## 3. Local Machine Prerequisites

Install these first:

1. Node.js 18+
2. npm
3. Git
4. EAS CLI (Expo Application Services)

Install EAS CLI globally:

```bash
npm install -g eas-cli
```

Log in to Expo:

```bash
eas login
```

## 4. Install Project Dependencies

From repository root:

```bash
npm install
```

Verify the mobile app config resolves:

```bash
npm exec --workspace @lifestyle-os/mobile -- expo config --json
```

If you are updating dependencies, use the mobile workspace command so Expo installs the SDK 54-compatible packages in the correct place:

```bash
npm exec --workspace @lifestyle-os/mobile -- expo install --fix
```

## 5. Configure Environment Variables

Copy env example:

```bash
cp .env.example .env
```

At minimum, set these correctly in .env:

- DATABASE_URL
- JWT_SECRET
- API_PORT
- EXPO_PUBLIC_API_URL
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_REDIRECT_URI

Important API URL examples:

- iOS simulator: http://localhost:4000/api
- Android emulator: http://10.0.2.2:4000/api
- Physical device: http://YOUR_LOCAL_IP:4000/api

## 6. Host Legal Pages Publicly (Required)

Stores require a public privacy policy URL.

You already have drafts:

- [docs/privacy-policy.md](docs/privacy-policy.md)
- [docs/terms-of-service.md](docs/terms-of-service.md)

Do this:

1. Replace placeholder content and support email.
2. Publish them to a public URL (your website, GitHub Pages, Notion public page, etc.).
3. Update URLs in [apps/mobile/app.json](apps/mobile/app.json) under extra.legal.

## 7. Set Correct App Identity (Bundle IDs)

In [apps/mobile/app.json](apps/mobile/app.json), verify:

- ios.bundleIdentifier is unique and owned by your Apple account.
- android.package is unique and owned by your Play Console app.

Example format:

- com.yourcompany.lifestyleos

Do not change these after your app is live unless you are creating a new app listing.

## 8. Prepare Store Visual Assets

Before submission, create production assets:

1. App icon (1024x1024)
2. Splash screen image
3. Screenshots for phones (and tablets for iOS if required)
4. Optional feature graphic (Play Store)

Then wire icon/splash paths in [apps/mobile/app.json](apps/mobile/app.json).

## 9. Verify App Works Before Building

Start API server:

```bash
npm run api
```

Start mobile app:

```bash
npm run mobile
```

Manual checks:

1. Google login works.
2. Dashboard loads live data.
3. Capture add/save works.
4. Sync/refresh works.
5. Sign-out works.
6. Relaunch app and confirm session persists.

## 10. Build Binaries with EAS

The build profiles are already defined in [eas.json](eas.json).

### Android build (AAB for Play Store)

```bash
eas build -p android --profile production
```

### iOS build (IPA for App Store)

```bash
eas build -p ios --profile production
```

Notes:

- First run will ask about credentials/signing. Let EAS manage unless you already have your own certificates.
- Build logs and artifacts are available in Expo dashboard.

## 11. Publish to Google Play Store

### 11.1 Create app listing

In Play Console:

1. Create new app.
2. Set app name, default language, app type.
3. Fill store listing (short and full description).

### 11.2 Complete required Play forms

1. App content (privacy policy URL required)
2. Data safety form
3. Target audience
4. Ads declaration
5. Content rating questionnaire

### 11.3 Upload build

1. Go to Test and release > Production (or Internal testing first).
2. Upload AAB built by EAS.
3. Add release notes.
4. Roll out release.

Recommendation for beginners:

- First use Internal Testing.
- Then move to Closed Testing.
- Then Production staged rollout.

## 12. Publish to Apple App Store

### 12.1 Create app in App Store Connect

1. Create new app record.
2. Use same bundle ID as ios.bundleIdentifier.
3. Set app name, primary language, SKU.

### 12.2 Upload iOS build

If using EAS submit:

```bash
eas submit -p ios --profile production
```

Or manually upload from EAS artifact using Transporter.

### 12.3 Complete App Store metadata

1. App description
2. Keywords
3. Support URL
4. Privacy policy URL
5. Screenshots
6. App review contact info

### 12.4 Complete compliance

1. App privacy questionnaire
2. Encryption export compliance (set in config where applicable)

Then submit for review.

## 13. Recommended Release Order

For safest first launch:

1. Android Internal Testing release
2. iOS TestFlight release
3. Fix issues from testers
4. Submit both stores for production
5. Use staged rollout on Play first

## 14. Versioning Rules (Do This Every Release)

In [apps/mobile/app.json](apps/mobile/app.json):

- Increase expo.version each release (for users)
- Increase ios.buildNumber each iOS upload
- Increase android.versionCode each Android upload

If you forget to increment build numbers, stores will reject upload.

## 15. Common Newbie Mistakes (Avoid These)

1. Using localhost API URL in production build
- Real users cannot reach your localhost.
- Use a public HTTPS API endpoint for production builds.

2. Missing privacy policy URL
- Both stores can block review.

3. Bundle/package IDs mismatch
- Must match what was registered in each store.

4. OAuth redirect mismatch
- Google OAuth redirect must match backend callback config.

5. Not testing on real devices
- Emulators do not catch everything.

## 16. Production Checklist (Copy/Paste)

- [ ] Public HTTPS API deployed
- [ ] .env production values set securely
- [ ] Legal docs published publicly
- [ ] app.json legal URLs updated
- [ ] Icons/splash/screenshots ready
- [ ] Google login tested on physical iOS + Android devices
- [ ] Capture and sync tested against production API
- [ ] Android AAB built (production profile)
- [ ] iOS IPA built (production profile)
- [ ] Internal testing complete and signed off
- [ ] Store metadata complete
- [ ] Data safety/privacy forms complete
- [ ] Version/build numbers incremented correctly

## 17. Useful Commands Quick Reference

Install:

```bash
npm install
```

Run API:

```bash
npm run api
```

Run mobile:

```bash
npm run mobile
```

Android local launch:

```bash
npm run mobile:android
```

iOS local launch:

```bash
npm run mobile:ios
```

Build Android production:

```bash
eas build -p android --profile production
```

Build iOS production:

```bash
eas build -p ios --profile production
```

Submit Android:

```bash
eas submit -p android --profile production
```

Submit iOS:

```bash
eas submit -p ios --profile production
```

## 18. Final Note

For your first release, optimize for stability, not feature count. A small stable MVP that passes review is better than a large unstable release.
