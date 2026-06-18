import { DESKTOP_USER_AGENT } from './constants';
import { getQueryParam } from './url';
import type { Platform } from './types';

/** Result of a deferred-match POST. */
export interface DeferredMatchResult {
  clickId?: string;
  matched: boolean;
}

/**
 * Runs a fetch with an abort-based timeout. Returns null on any error or
 * timeout — callers must treat the network as best-effort.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Re-hits a Universal/App Link tracking URL with a spoofed desktop UA and
 * `redirect: 'manual'`, then reads `nx_pb` out of the `Location` header.
 *
 * Returns the `nx_pb` token, or null when not attributed / on any failure.
 */
export async function resolveUniversalLink(
  trackingUrl: string,
  timeoutMs: number,
): Promise<string | null> {
  const response = await fetchWithTimeout(
    trackingUrl,
    {
      method: 'GET',
      redirect: 'manual',
      headers: { 'User-Agent': DESKTOP_USER_AGENT },
    },
    timeoutMs,
  );

  if (!response) {
    return null;
  }

  const location = response.headers.get('location');
  if (!location) {
    return null;
  }
  return getQueryParam(location, 'nx_pb');
}

/**
 * Posts a deferred-match request. The server derives the IP itself; we never
 * send it. Returns null on any failure.
 */
export async function postDeferredMatch(
  baseUrl: string,
  platform: Platform,
  timeoutMs: number,
): Promise<DeferredMatchResult | null> {
  const url = `${baseUrl.replace(/\/+$/, '')}/trk/deferred-match`;
  const response = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ platform }),
    },
    timeoutMs,
  );

  if (!response || !response.ok) {
    return null;
  }

  try {
    const json = (await response.json()) as DeferredMatchResult;
    return { matched: Boolean(json.matched), clickId: json.clickId };
  } catch {
    return null;
  }
}
