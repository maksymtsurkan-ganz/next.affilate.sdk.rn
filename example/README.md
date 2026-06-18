# NEX Attribution SDK — sample app

A one-screen React Native app that exercises `next-affiliate-sdk`.

## What it shows

- The current `Attribution` (`nxPb`, `clickId`, `source`, `isAttributed`).
- **Check deferred** → `checkDeferredOnFirstLaunch()`, then refreshes the display.
- **Simulate scheme link** → `handleLink("myapp://open?nx_pb=DEMO_TOKEN&nx_click_id=demo-click")`.
- **Send test conversion** → reads the stored `nxPb` and POSTs it to a placeholder URL.

Real deep links are wired via `Linking.getInitialURL()` (cold start) and
`Linking.addEventListener('url', …)` (warm) into `handleLink`.

The dev `baseDomain` and app `scheme` are constants at the top of `App.tsx`.

## Run

```bash
# From the repo root, build the library first:
npm install && npm run build

# Then, in this folder:
cd example
npm install
npm run ios       # or: npm run android
```

## Native setup required for real deep links

### iOS — custom URL scheme (`Info.plist`)

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array><string>myapp</string></array>
  </dict>
</array>
```

iOS also needs `linkingApi` wired in `AppDelegate` (the default RN template's
`RCTLinkingManager` `openURL`/`continueUserActivity` hooks).

### iOS — Universal Links (Associated Domains)

Enable the **Associated Domains** capability and add:

```
applinks:<slug>.next-ads-server-dev.com
```

### Android — intent filters (`AndroidManifest.xml`)

```xml
<!-- Custom scheme -->
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="myapp" />
</intent-filter>

<!-- App Links (verified https) -->
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https"
        android:host="*.next-ads-server-dev.com"
        android:pathPrefix="/trk" />
</intent-filter>
```

## Trying it without native deep links

Tap **Simulate scheme link** to feed a fake scheme URL into `handleLink`, or
from a terminal:

```bash
# Android
adb shell am start -a android.intent.action.VIEW \
  -d "myapp://open?nx_pb=DEMO_TOKEN&nx_click_id=demo-click"

# iOS simulator
xcrun simctl openurl booted "myapp://open?nx_pb=DEMO_TOKEN&nx_click_id=demo-click"
```
