import { getQueryParam, getScheme, isTrackingLink } from '../src/url';

describe('getQueryParam', () => {
  it('reads nx_pb and nx_click_id from a scheme link', () => {
    const url = 'myapp://open?nx_pb=DEMO_TOKEN&nx_click_id=demo-click';
    expect(getQueryParam(url, 'nx_pb')).toBe('DEMO_TOKEN');
    expect(getQueryParam(url, 'nx_click_id')).toBe('demo-click');
  });

  it('url-decodes values and handles +', () => {
    const url = 'myapp://open?nx_pb=a%2Bb%20c+d';
    expect(getQueryParam(url, 'nx_pb')).toBe('a+b c d');
  });

  it('ignores a fragment after the query', () => {
    expect(getQueryParam('myapp://o?nx_pb=tok#frag', 'nx_pb')).toBe('tok');
  });

  it('returns null when absent or no query', () => {
    expect(getQueryParam('myapp://open?foo=bar', 'nx_pb')).toBeNull();
    expect(getQueryParam('myapp://open', 'nx_pb')).toBeNull();
  });
});

describe('getScheme', () => {
  it('lower-cases the scheme', () => {
    expect(getScheme('MyApp://open')).toBe('myapp');
    expect(getScheme('https://x.example.com/trk/abc')).toBe('https');
  });

  it('returns null for a schemeless string', () => {
    expect(getScheme('/trk/abc')).toBeNull();
  });
});

describe('isTrackingLink', () => {
  it('matches https /trk/<shortCode>', () => {
    expect(isTrackingLink('https://acme.next-ads-server-dev.com/trk/abc123')).toBe(true);
    expect(isTrackingLink('http://acme.next-ads-server-dev.com/trk/abc123?x=1')).toBe(true);
  });

  it('rejects custom schemes and non-trk paths', () => {
    expect(isTrackingLink('myapp://open?nx_pb=x')).toBe(false);
    expect(isTrackingLink('https://acme.next-ads-server-dev.com/other')).toBe(false);
  });
});
