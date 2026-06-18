/**
 * Spoofed desktop User-Agent sent on the Universal/App Link resolve.
 *
 * Forces the tracking endpoint to return a 302 redirect (with `nx_pb` in the
 * `Location` header) instead of the mobile HTML interstitial page.
 */
export const DESKTOP_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/** Default network timeout for SDK calls, in milliseconds. */
export const DEFAULT_TIMEOUT_MS = 4000;

/** Persistence keys (shared across all NEX SDKs). */
export const StorageKeys = {
  nxPb: 'next_affiliate_nx_pb',
  clickId: 'next_affiliate_click_id',
  source: 'next_affiliate_source',
  deferredChecked: 'next_affiliate_deferred_checked',
} as const;
