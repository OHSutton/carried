# Carried

Gym tracker with no ads, no tracking, most of the functionality of paid apps.
Plan your workouts, log sets in real time, track body weight, and see some stats.

## Tech Stack

- **TypeScript**
- **React Native** (Expo SDK 54) — cross-platform, though currently Android-only
- **SQLite** (`expo-sqlite`) — all data lives on-device, no backend, no accounts
- **EAS Build** — cloud builds triggered via GitHub Actions on tagged commits

## Installation

Until this hits the Play Store, grab the latest `.apk` from [Releases](../../releases), transfer it to your phone, and install it. You'll need to allow installs from unknown sources.

### Running locally

```bash
npm install
npx expo start
```

Scan the QR with Expo Go or press `a` for Android emulator.

### Pushing a release

1. Make your changes, commit them
2. Tag it:
   ```bash
   git tag v1.x.x
   git push origin master --tags
   ```
3. GitHub Actions picks up the tag, kicks off EAS builds (AAB + APK), and creates a GitHub Release with both artifacts attached
4. Done. Go to Releases and downlaod what you need