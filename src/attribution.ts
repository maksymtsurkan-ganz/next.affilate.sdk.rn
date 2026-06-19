import type { Attribution, AttributionSource } from './types';

/** Builds an {@link Attribution}, deriving `isAttributed`. */
export function makeAttribution(
  nxPb: string | null,
  clickId: string | null,
  source: AttributionSource,
  route: string | null = null,
): Attribution {
  return {
    nxPb,
    clickId,
    source,
    route,
    isAttributed: nxPb != null || clickId != null,
  };
}

/** Narrows an arbitrary string to a known {@link AttributionSource}, else null. */
export function parseAttributionSource(value: string | null): AttributionSource | null {
  switch (value) {
    case 'scheme':
    case 'universalLink':
    case 'deferred':
      return value;
    default:
      return null;
  }
}
