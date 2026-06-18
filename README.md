# next-affiliate-sdk (React Native)

NEX mobile attribution SDK for React Native. Recovers the signed `nx_pb`
attribution token (and a deferred `clickId`) for a merchant app and exposes it
so the host app can forward it into its server-to-server conversion / postback.

`nx_pb` is an **opaque** signed token — the SDK never parses it; it stores and
forwards it as-is. The NEX server decodes it at postback time.

The core is pure TypeScript: `fetch` for networking, AsyncStorage for
persistence. No native modules are added by this package.

## Install

Installed by git URL (no registry):

```bash
npm install git+https://github.com/maksymtsurkan-ganz/next.affilate.sdk.rn.git#main
```

### Peer dependencies

Install these in your app if you don't already have them:

```bash
npm install react react-native @react-native-async-storage/async-storage
```

| Peer dependency | Why |
| --- | --- |
| `react`, `react-native` | host runtime |
| `@react-native-async-storage/async-storage` | persists the recovered attribution |

## Usage (5 lines)

```ts
import { configure, handleLink, checkDeferredOnFirstLaunch, getAttribution } from 'next-affiliate-sdk';

configure({ baseDomain: 'next-ads-server-dev.com', scheme: 'myapp' });
await checkDeferredOnFirstLaunch();                 // first launch only (once per install)
await handleLink('myapp://open?nx_pb=...&nx_click_id=...'); // from a deep link
const attribution = await getAttribution();         // { nxPb, clickId, source, isAttributed }
```

Wire your deep-link handling into `handleLink`:

```ts
import { Linking } from 'react-native';

const initial = await Linking.getInitialURL();
if (initial) await handleLink(initial);
Linking.addEventListener('url', ({ url }) => handleLink(url));
```

## Public API

| Function | Description |
| --- | --- |
| `configure(config)` | Configure the SDK. `config = { baseDomain, scheme, timeoutMs?, deferredMatchBaseUrl? }`. |
| `handleLink(url)` | Process a launch / deep-link URL. Returns `Promise<Attribution \| null>`. |
| `checkDeferredOnFirstLaunch()` | Deferred install match, **run once per install**. Returns `Promise<Attribution \| null>`. |
| `getAttribution()` | The currently stored attribution. Returns `Promise<Attribution \| null>`. |
| `clearAttribution()` | Wipe the stored attribution (keeps the deferred-checked flag). |

A `NextAffiliateSdk` class is also exported if you prefer your own instance over
the module-level singleton.

### `Attribution`

```ts
interface Attribution {
  nxPb: string | null;       // opaque token (scheme or universal link)
  clickId: string | null;    // deferred match (or nx_click_id on the scheme link)
  source: 'scheme' | 'universalLink' | 'deferred';
  isAttributed: boolean;     // nxPb != null || clickId != null
}
```

### How `handleLink` decides

- URL scheme equals `config.scheme` → reads `nx_pb` + `nx_click_id` query params (`source = scheme`).
- `https://<slug>.<baseDomain>/trk/<shortCode>` (Universal/App Link) → re-hits the
  tracking URL with a spoofed **desktop User-Agent** and `redirect: 'manual'`, reads
  `nx_pb` out of the `Location` header (`source = universalLink`). No `nx_pb` ⇒ not attributed.
- Anything else → ignored (returns `null`).

All calls are **best-effort**: every error is caught, `null` is returned, and the
SDK never throws into your app.

## Required app setup (deep links)

To make real custom-scheme and Universal/App Link opens reach `handleLink`,
register them natively:

### iOS — `Info.plist` (custom scheme)

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array><string>myapp</string></array>
  </dict>
</array>
```

### iOS — Associated Domains (Universal Links)

Enable the **Associated Domains** capability and add `applinks:<slug>.<baseDomain>`.

### Android — `AndroidManifest.xml`

```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="myapp" />
</intent-filter>

<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https" android:host="*.next-ads-server-dev.com" android:pathPrefix="/trk" />
</intent-filter>
```

(App Links also require an `assetlinks.json` served by the domain; Universal
Links require an `apple-app-site-association` file.)

## Sample app

A runnable one-screen sample lives in [`example/`](./example). See
[`example/README.md`](./example/README.md) for how to run it and the full native
setup.

## Development

```bash
npm install
npm run build   # tsc → lib/
npm run lint
npm test        # jest
```

## License

MIT
