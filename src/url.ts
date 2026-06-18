/**
 * Extracts a single query-string parameter from a URL, without relying on the
 * WHATWG `URL` class (whose `searchParams` support varies across RN engines).
 *
 * Returns the URL-decoded value, or null when the param is absent.
 */
export function getQueryParam(url: string, name: string): string | null {
  const queryStart = url.indexOf('?');
  if (queryStart === -1) {
    return null;
  }
  // Drop any fragment so `?a=b#c` does not leak into the last value.
  let query = url.slice(queryStart + 1);
  const hashStart = query.indexOf('#');
  if (hashStart !== -1) {
    query = query.slice(0, hashStart);
  }

  for (const pair of query.split('&')) {
    if (pair === '') {
      continue;
    }
    const eq = pair.indexOf('=');
    const rawKey = eq === -1 ? pair : pair.slice(0, eq);
    if (decodeComponent(rawKey) !== name) {
      continue;
    }
    const rawValue = eq === -1 ? '' : pair.slice(eq + 1);
    return decodeComponent(rawValue);
  }
  return null;
}

function decodeComponent(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

/** Lower-cased scheme of a URL (the part before `://` or `:`), or null. */
export function getScheme(url: string): string | null {
  const match = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(url);
  return match ? match[1].toLowerCase() : null;
}

/** Whether `url` is an `http(s)` tracking link of the form `/trk/<shortCode>`. */
export function isTrackingLink(url: string): boolean {
  const scheme = getScheme(url);
  if (scheme !== 'http' && scheme !== 'https') {
    return false;
  }
  return /\/trk\/[^/?#]+/.test(url);
}
