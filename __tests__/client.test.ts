import { resolveUniversalLink, postDeferredMatch } from '../src/client';
import { DESKTOP_USER_AGENT } from '../src/constants';
import { mockJsonResponse, mockRedirectResponse } from './helpers';

describe('resolveUniversalLink', () => {
  const url = 'https://acme.next-ads-server-dev.com/trk/abc123';

  it('sends desktop UA + redirect:manual and reads nx_pb from Location', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(
        mockRedirectResponse('https://store.example.com/landing?nx_pb=SIGNED_TOKEN&foo=bar'),
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await resolveUniversalLink(url, 4000);

    expect(result).toBe('SIGNED_TOKEN');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, init] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe(url);
    expect(init.redirect).toBe('manual');
    expect(init.headers['User-Agent']).toBe(DESKTOP_USER_AGENT);
  });

  it('returns null when Location lacks nx_pb (geo-rejected / paused)', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(mockRedirectResponse('https://store.example.com/x?foo=bar')) as never;
    expect(await resolveUniversalLink(url, 4000)).toBeNull();
  });

  it('returns null when there is no Location header', async () => {
    global.fetch = jest.fn().mockResolvedValue(mockRedirectResponse(null)) as never;
    expect(await resolveUniversalLink(url, 4000)).toBeNull();
  });

  it('returns null and never throws when fetch rejects', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as never;
    await expect(resolveUniversalLink(url, 4000)).resolves.toBeNull();
  });
});

describe('postDeferredMatch', () => {
  it('posts {platform} (no IP) and returns the parsed body', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(mockJsonResponse({ matched: true, clickId: 'c-1' }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await postDeferredMatch('https://next-ads-server-dev.com', 'android', 4000);

    expect(result).toEqual({ matched: true, clickId: 'c-1' });
    const [calledUrl, init] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe('https://next-ads-server-dev.com/trk/deferred-match');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ platform: 'android' });
  });

  it('returns null on a non-ok response', async () => {
    global.fetch = jest.fn().mockResolvedValue(mockJsonResponse({}, false)) as never;
    expect(await postDeferredMatch('https://x.com', 'ios', 4000)).toBeNull();
  });
});
