# Navo Music

Android-first Expo + React Native + TypeScript music player for local audio, Audius, Jamendo, and user-owned audio URLs.

## Run locally

1. Install Node.js 24.3 or later and Android Studio/Android SDK.
2. Copy `.env.example` to `.env`.
3. Add your Audius API key and Jamendo client ID to `.env` as needed.
4. Install packages and launch:

   ```sh
   npm ci
   npx expo start
   ```

5. To build/install the Android app with its background audio service, use a development/native build:

   ```sh
   npx expo prebuild --platform android
   npx expo run:android
   ```

Expo Go cannot apply the background-audio Android manifest changes. The GitHub Actions workflow builds a release APK with `npx expo prebuild --platform android --clean` and publishes it as the `navo-music-android` artifact.

## API credentials

The app reads `EXPO_PUBLIC_AUDIUS_API_KEY` and `EXPO_PUBLIC_JAMENDO_CLIENT_ID` from `.env`. Expo public variables are bundled into the app and are visible to anyone who can inspect the APK; use only client identifiers/API keys intended for public mobile clients. Never put private credentials in these variables. Audius trending can be attempted without an API key, while Jamendo requires a client ID.

## Offline and licensing

- Local audio is read after the user grants media-library access.
- Jamendo downloads are offered only when the API marks the track as downloadable. Confirm each track's license before redistribution or other uses.
- User audio URLs should point to audio the user owns or has permission to use.
- Downloaded tracks and library metadata are stored in the app's private SQLite/documents storage. Removing the app removes its private downloads.
- Search results are cached for quick refresh. When offline, the catalogue shows only local and explicitly downloaded audio.

## Project map

- `app/`: Expo Router screens and tab navigation
- `src/components/`: reusable track rows, artwork, mini-player, and UI controls
- `src/services/`: Audius, Jamendo, local media, SQLite, and offline downloads
- `src/store/`: Zustand playback/library state
- `src/hooks/`: reusable UI hooks
- `src/theme/`: color palette, spacing, and shape tokens
- `assets/navo-mark.svg`: original Navo logo; PNG app/splash assets are generated from it

Run `npm run check` for TypeScript and ESLint checks. Run `npm run assets:generate` after changing the SVG logo.
