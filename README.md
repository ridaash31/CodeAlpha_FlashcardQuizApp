# Flashcard Quiz App

A clean flashcard app for studying. Each card shows a question on the front and reveals the answer with a button.

Built for the **CodeAlpha App Development Internship**.

## Internship task
Task 1: Flashcard Quiz App

## Features
- Question on the front, answer on the back with a **Show Answer** button
- **Next** and **Previous** buttons (wraps around at both ends) with a progress bar
- Add, edit and delete flashcards from the **Manage cards** tab
- Cards are saved on the device with AsyncStorage and remain after restarting the app
- Validation (question and answer required), loading state and empty state
- Starts with 5 sample cards

## Technologies used
React Native, Expo, TypeScript, AsyncStorage

## Project structure
```
App.tsx            # all screens and logic
index.ts           # Expo entry point
app.json           # Expo configuration
```

## Prerequisites
- Node.js 20 or newer and npm
- The **Expo Go** app on your phone (or an Android emulator / iOS simulator)

## Installation and running
```bash
npm install
npx expo start
```
Scan the QR code with Expo Go, or press `a` (Android emulator) / `i` (iOS simulator).
This project uses Expo SDK 58, so use an Expo Go version that supports it.

## Screenshots
Add screenshots here (for example a `screenshots/` folder).

## Testing details
- `npx tsc --noEmit`: passes with no errors
- `npx expo export --platform android`: bundles successfully
- Not tested: running on a physical device or emulator (UI behaviour was not exercised manually)

## Known limitations
- Cards live only on the device (no cloud sync)
- No shuffle or spaced-repetition mode
