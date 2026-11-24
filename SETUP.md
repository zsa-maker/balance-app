# Balance app – Android setup (all free)

## 1. Copy the files into your project
Unzip into your project root (same folder as `package.json`). It adds or replaces:
- `src/App.jsx`, `src/index.css`, `src/firebase.js`
- `src/lib/notifications.js`, `src/lib/native.js` (new)
- `capacitor.config.json`, `firestore.rules`
- `android/` (the native project, with the home-screen widget already built in)

## 2. Install the packages
```
npm install @capacitor/core@8 @capacitor/android@8 @capacitor/app@8 @capacitor/local-notifications@8
npm install -D @capacitor/cli@8
```
Add this to the "scripts" section of `package.json`:
```
"android": "vite build && npx cap sync android && npx cap open android"
```

## 3. Firebase console (one time)
1. **Authentication → Get started → Sign-in method → Email/Password → Enable.**
   (Usernames are turned into internal addresses behind the scenes, so users never see an email field.)
2. **Firestore → Rules:** paste the contents of `firestore.rules` and click **Publish**.
3. Existing accounts move over automatically the first time each person logs in.
   Once the `users` collection in Firestore is empty, change the `users` block in the rules to
   `allow read, write: if false;`.

## 4. Build the app onto your phone
1. Install **Android Studio** (free) from developer.android.com/studio.
2. On the phone: Settings → About phone → tap "Build number" 7 times → Developer options → turn on **USB debugging**.
3. Connect the phone by USB and run `npm run android`.
4. In Android Studio, pick your phone at the top and press ▶ Run.
   (Or use Build → Build APK(s) and send the APK file to the phone.)

After every code change, run `npm run android` again.

## 5. On the phone
- Allow notifications when the app asks. If it opens the "Alarms & reminders" screen, turn it on (this makes reminders arrive on time).
- **Battery:** Settings → Apps → איזון יומי → Battery → **Unrestricted**.
  Samsung and Xiaomi phones otherwise delay or block reminders.
- **Widget:** long-press the home screen → Widgets → איזון יומי → drag it onto the screen.

## Troubleshooting
- Widget says "open the app once": open the app; the widget updates within a second.
- No notifications: check the battery setting above, and that notifications are on for the app.
