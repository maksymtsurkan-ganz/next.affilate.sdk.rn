import { NextAffiliateSdk } from '../src/sdk';
import { StorageKeys } from '../src/constants';
import { mockJsonResponse, mockRedirectResponse, MemoryStore } from './helpers';

const config = { baseDomain: 'next-ads-server-dev.com', scheme: 'myapp' };

describe('handleLink — scheme', () => {
  it('parses nx_pb + nx_click_id and stores source=scheme', async () => {
    const store = new MemoryStore();
    const sdk = new NextAffiliateSdk(store);
    sdk.configure(config);

    const attr = await sdk.handleLink('myapp://open?nx_pb=DEMO&nx_click_id=demo-click');

    expect(attr).toEqual({
      nxPb: 'DEMO',
      clickId: 'demo-click',
      source: 'scheme',
      route: null,
      isAttributed: true,
    });
    expect(store.map.get(StorageKeys.nxPb)).toBe('DEMO');
    expect(store.map.get(StorageKeys.source)).toBe('scheme');
  });

  it('is case-insensitive on the scheme', async () => {
    const sdk = new NextAffiliateSdk(new MemoryStore());
    sdk.configure(config);
    const attr = await sdk.handleLink('MyApp://open?nx_pb=X');
    expect(attr?.nxPb).toBe('X');
  });

  it('carries the route query param and persists it', async () => {
    const store = new MemoryStore();
    const sdk = new NextAffiliateSdk(store);
    sdk.configure(config);

    const attr = await sdk.handleLink('myapp://open?nx_pb=DEMO&route=/carwash/123');

    expect(attr?.route).toBe('/carwash/123');
    expect(store.map.get(StorageKeys.route)).toBe('/carwash/123');
  });
});

describe('handleLink — universal link', () => {
  it('resolves nx_pb from Location and stores source=universalLink', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(mockRedirectResponse('https://store.example.com/x?nx_pb=SIGNED')) as never;

    const store = new MemoryStore();
    const sdk = new NextAffiliateSdk(store);
    sdk.configure(config);

    const attr = await sdk.handleLink('https://acme.next-ads-server-dev.com/trk/abc');

    expect(attr).toEqual({
      nxPb: 'SIGNED',
      clickId: null,
      source: 'universalLink',
      route: null,
      isAttributed: true,
    });
  });

  it('reads route from the incoming link, not the resolved Location', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(mockRedirectResponse('https://store.example.com/x?nx_pb=SIGNED')) as never;

    const store = new MemoryStore();
    const sdk = new NextAffiliateSdk(store);
    sdk.configure(config);

    const attr = await sdk.handleLink(
      'https://acme.next-ads-server-dev.com/trk/abc?route=/carwash/9',
    );

    expect(attr?.nxPb).toBe('SIGNED');
    expect(attr?.route).toBe('/carwash/9');
    expect(store.map.get(StorageKeys.route)).toBe('/carwash/9');
  });

  it('not-attributed: no nx_pb in Location → null, stores nothing', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(mockRedirectResponse('https://store.example.com/x')) as never;

    const store = new MemoryStore();
    const sdk = new NextAffiliateSdk(store);
    sdk.configure(config);

    expect(await sdk.handleLink('https://acme.next-ads-server-dev.com/trk/abc')).toBeNull();
    expect(store.map.size).toBe(0);
  });
});

describe('handleLink — ignored / guards', () => {
  it('ignores unrelated URLs', async () => {
    const sdk = new NextAffiliateSdk(new MemoryStore());
    sdk.configure(config);
    expect(await sdk.handleLink('https://example.com/about')).toBeNull();
    expect(await sdk.handleLink('other://open?nx_pb=X')).toBeNull();
  });

  it('returns null when not configured', async () => {
    const sdk = new NextAffiliateSdk(new MemoryStore());
    expect(await sdk.handleLink('myapp://open?nx_pb=X')).toBeNull();
  });
});

describe('checkDeferredOnFirstLaunch — once-guard', () => {
  it('matches once, stores clickId, then is a no-op on the second call', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(mockJsonResponse({ matched: true, clickId: 'c-9' }));
    global.fetch = fetchMock as never;

    const store = new MemoryStore();
    const sdk = new NextAffiliateSdk(store);
    sdk.configure(config);

    const first = await sdk.checkDeferredOnFirstLaunch();
    expect(first).toEqual({
      nxPb: null,
      clickId: 'c-9',
      source: 'deferred',
      route: null,
      isAttributed: true,
    });
    expect(store.map.get(StorageKeys.deferredChecked)).toBe('true');

    const second = await sdk.checkDeferredOnFirstLaunch();
    expect(second).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('not matched → null and no attribution stored', async () => {
    global.fetch = jest.fn().mockResolvedValue(mockJsonResponse({ matched: false })) as never;
    const store = new MemoryStore();
    const sdk = new NextAffiliateSdk(store);
    sdk.configure(config);

    expect(await sdk.checkDeferredOnFirstLaunch()).toBeNull();
    expect(store.map.get(StorageKeys.clickId)).toBeUndefined();
  });
});

describe('getAttribution / clearAttribution', () => {
  it('not-attributed path: empty store reads null', async () => {
    const sdk = new NextAffiliateSdk(new MemoryStore());
    sdk.configure(config);
    expect(await sdk.getAttribution()).toBeNull();
  });

  it('clear wipes attribution but keeps the deferred flag', async () => {
    const store = new MemoryStore();
    const sdk = new NextAffiliateSdk(store);
    sdk.configure(config);

    await sdk.handleLink('myapp://open?nx_pb=DEMO');
    store.map.set(StorageKeys.deferredChecked, 'true');

    await sdk.clearAttribution();

    expect(await sdk.getAttribution()).toBeNull();
    expect(store.map.get(StorageKeys.deferredChecked)).toBe('true');
  });
});
