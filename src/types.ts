/**
 * Where an {@link Attribution} was captured.
 *
 * - `scheme` — from a custom-scheme deep link (e.g. `myapp://open?nx_pb=...`).
 * - `universalLink` — from a Universal/App Link resolve against the tracking redirect.
 * - `deferred` — from a deferred install match on first launch.
 */
export type AttributionSource = 'scheme' | 'universalLink' | 'deferred';

/**
 * The recovered attribution for the current install.
 *
 * `nxPb` is an opaque, signed token. The SDK never parses it; it stores and
 * forwards it as-is. The NEX server decodes it at postback time.
 */
export interface Attribution {
  /** Opaque signed token, from a scheme link or a Universal Link resolve. */
  nxPb: string | null;
  /** Click identifier, from a deferred match (or `nx_click_id` on a scheme link). */
  clickId: string | null;
  /** Where this attribution was captured. */
  source: AttributionSource;
  /**
   * Optional in-app navigation path carried by the link (e.g. `/carwash/123`),
   * from the `route` query param on the scheme/Universal Link. The host app
   * navigates to it after open. `null` when the link carried no route.
   */
  route: string | null;
  /** `true` when at least one identifier is present. */
  isAttributed: boolean;
}

/** Configuration passed to {@link configure}. */
export interface NextAffiliateConfig {
  /**
   * The platform base domain, e.g. `next-ads-server-dev.com`.
   *
   * Tracking links live on a per-merchant subdomain:
   * `https://<slug>.<baseDomain>/trk/<shortCode>`.
   */
  baseDomain: string;
  /** The app's custom URL scheme, e.g. `myapp`. */
  scheme: string;
  /** Network timeout for SDK calls, in milliseconds. Defaults to 4000. */
  timeoutMs?: number;
  /**
   * Optional override for the deferred-match endpoint base URL.
   * When omitted, `https://<baseDomain>` is used.
   */
  deferredMatchBaseUrl?: string;
}

/** Mobile platform reported to the deferred-match endpoint. */
export type Platform = 'ios' | 'android';
