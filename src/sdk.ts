import { DEFAULT_TIMEOUT_MS } from './constants';
import { makeAttribution } from './attribution';
import { AttributionStore, type KeyValueStore } from './storage';
import { postDeferredMatch, resolveUniversalLink } from './client';
import { getQueryParam, getScheme, isTrackingLink } from './url';
import type { Attribution, NextAffiliateConfig, Platform } from './types';

/** Internal, fully-resolved configuration. */
interface ResolvedConfig {
  baseDomain: string;
  scheme: string;
  timeoutMs: number;
  deferredMatchBaseUrl: string;
}

/**
 * The NEX attribution SDK.
 *
 * Every public method is best-effort: it catches all errors, returns null, and
 * never throws to the host app.
 */
export class NextAffiliateSdk {
  private config: ResolvedConfig | null = null;
  private readonly store: AttributionStore;

  /**
   * @param storeOverride optional key/value store, mainly for tests. Defaults
   *   to AsyncStorage.
   */
  constructor(storeOverride?: KeyValueStore) {
    this.store = new AttributionStore(storeOverride);
  }

  /** Configures the SDK. Must be called before any other method. */
  configure(config: NextAffiliateConfig): void {
    const scheme = config.scheme.toLowerCase();
    this.config = {
      baseDomain: config.baseDomain,
      scheme,
      timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      deferredMatchBaseUrl: config.deferredMatchBaseUrl ?? `https://${config.baseDomain}`,
    };
  }

  /**
   * Processes an incoming launch / deep-link URL.
   *
   * - custom scheme (`config.scheme`): reads `nx_pb` + `nx_click_id` params.
   * - `https://…/trk/<shortCode>`: runs the Universal/App Link resolve.
   * - anything else: ignored.
   *
   * Returns the stored {@link Attribution}, or null when nothing was captured.
   */
  async handleLink(url: string): Promise<Attribution | null> {
    try {
      const config = this.config;
      if (!config || !url) {
        return null;
      }

      const scheme = getScheme(url);
      if (scheme === config.scheme) {
        return await this.handleSchemeLink(url);
      }
      if (isTrackingLink(url)) {
        return await this.handleUniversalLink(url, config);
      }
      return null;
    } catch {
      return null;
    }
  }

  private async handleSchemeLink(url: string): Promise<Attribution | null> {
    const nxPb = getQueryParam(url, 'nx_pb');
    const clickId = getQueryParam(url, 'nx_click_id');
    if (nxPb == null && clickId == null) {
      return null;
    }
    const route = emptyToNull(getQueryParam(url, 'route'));
    const attribution = makeAttribution(nxPb, clickId, 'scheme', route);
    await this.store.write(attribution);
    return attribution;
  }

  private async handleUniversalLink(
    url: string,
    config: ResolvedConfig,
  ): Promise<Attribution | null> {
    const nxPb = await resolveUniversalLink(url, config.timeoutMs);
    if (nxPb == null) {
      return null;
    }
    // The route lives on the INCOMING link the app was opened with, not on the
    // resolved Location (which is the offer URL).
    const route = emptyToNull(getQueryParam(url, 'route'));
    const attribution = makeAttribution(nxPb, null, 'universalLink', route);
    await this.store.write(attribution);
    return attribution;
  }

  /**
   * Runs the deferred-match flow exactly once per install (guarded by a
   * persisted flag). Returns the stored {@link Attribution} on a match, else null.
   */
  async checkDeferredOnFirstLaunch(): Promise<Attribution | null> {
    try {
      const config = this.config;
      if (!config) {
        return null;
      }
      if (await this.store.isDeferredChecked()) {
        return null;
      }
      await this.store.markDeferredChecked();

      const result = await postDeferredMatch(
        config.deferredMatchBaseUrl,
        currentPlatform(),
        config.timeoutMs,
      );
      if (!result || !result.matched || !result.clickId) {
        return null;
      }
      const attribution = makeAttribution(null, result.clickId, 'deferred');
      await this.store.write(attribution);
      return attribution;
    } catch {
      return null;
    }
  }

  /** Returns the currently stored {@link Attribution}, or null. */
  async getAttribution(): Promise<Attribution | null> {
    try {
      return await this.store.read();
    } catch {
      return null;
    }
  }

  /** Wipes the stored attribution. Does NOT reset the deferred-checked flag. */
  async clearAttribution(): Promise<void> {
    try {
      await this.store.clear();
    } catch {
      // best-effort
    }
  }
}

/** Collapses an absent or empty string to null. */
function emptyToNull(value: string | null): string | null {
  return value == null || value === '' ? null : value;
}

/**
 * Derives the wire platform value from React Native's runtime OS.
 *
 * `react-native` is required lazily so the pure-TS core stays importable in a
 * plain Node / Jest environment without the native module present. Defaults to
 * `ios` if the OS cannot be determined.
 */
function currentPlatform(): Platform {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Platform: RNPlatform } = require('react-native');
    return RNPlatform?.OS === 'android' ? 'android' : 'ios';
  } catch {
    return 'ios';
  }
}
