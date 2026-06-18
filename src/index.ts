import { NextAffiliateSdk } from './sdk';
import type { Attribution, NextAffiliateConfig } from './types';

export { NextAffiliateSdk } from './sdk';
export type { Attribution, AttributionSource, NextAffiliateConfig, Platform } from './types';
export { StorageKeys, DESKTOP_USER_AGENT } from './constants';
export type { KeyValueStore } from './storage';

/**
 * Shared singleton used by the module-level convenience functions below.
 * Most apps will use these rather than constructing {@link NextAffiliateSdk}.
 */
const instance = new NextAffiliateSdk();

/** Configures the shared SDK instance. Call once at app start. */
export function configure(config: NextAffiliateConfig): void {
  instance.configure(config);
}

/** Processes an incoming launch / deep-link URL on the shared instance. */
export function handleLink(url: string): Promise<Attribution | null> {
  return instance.handleLink(url);
}

/** Runs the deferred-match flow once per install on the shared instance. */
export function checkDeferredOnFirstLaunch(): Promise<Attribution | null> {
  return instance.checkDeferredOnFirstLaunch();
}

/** Returns the currently stored attribution from the shared instance. */
export function getAttribution(): Promise<Attribution | null> {
  return instance.getAttribution();
}

/** Wipes the stored attribution on the shared instance. */
export function clearAttribution(): Promise<void> {
  return instance.clearAttribution();
}
