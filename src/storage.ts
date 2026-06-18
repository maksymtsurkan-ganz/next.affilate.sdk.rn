import { StorageKeys } from './constants';
import { makeAttribution, parseAttributionSource } from './attribution';
import type { Attribution } from './types';

/**
 * Minimal key/value store contract. A subset of the
 * `@react-native-async-storage/async-storage` API so it can be faked in tests.
 */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Lazily resolves the AsyncStorage peer dependency.
 *
 * Imported dynamically so the pure-TS core can be unit-tested headlessly
 * without the native module being installed.
 */
function resolveAsyncStorage(): KeyValueStore {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@react-native-async-storage/async-storage');
  return (mod.default ?? mod) as KeyValueStore;
}

/** Persists and reads {@link Attribution} via a {@link KeyValueStore}. */
export class AttributionStore {
  private readonly store: KeyValueStore;

  constructor(store?: KeyValueStore) {
    this.store = store ?? resolveAsyncStorage();
  }

  async read(): Promise<Attribution | null> {
    const [nxPb, clickId, sourceRaw] = await Promise.all([
      this.store.getItem(StorageKeys.nxPb),
      this.store.getItem(StorageKeys.clickId),
      this.store.getItem(StorageKeys.source),
    ]);

    const source = parseAttributionSource(sourceRaw);
    if (source == null || (nxPb == null && clickId == null)) {
      return null;
    }
    return makeAttribution(nxPb, clickId, source);
  }

  async write(attribution: Attribution): Promise<void> {
    await Promise.all([
      attribution.nxPb != null
        ? this.store.setItem(StorageKeys.nxPb, attribution.nxPb)
        : this.store.removeItem(StorageKeys.nxPb),
      attribution.clickId != null
        ? this.store.setItem(StorageKeys.clickId, attribution.clickId)
        : this.store.removeItem(StorageKeys.clickId),
      this.store.setItem(StorageKeys.source, attribution.source),
    ]);
  }

  /** Wipes the stored attribution. Does NOT touch the deferred-checked flag. */
  async clear(): Promise<void> {
    await Promise.all([
      this.store.removeItem(StorageKeys.nxPb),
      this.store.removeItem(StorageKeys.clickId),
      this.store.removeItem(StorageKeys.source),
    ]);
  }

  async isDeferredChecked(): Promise<boolean> {
    return (await this.store.getItem(StorageKeys.deferredChecked)) === 'true';
  }

  async markDeferredChecked(): Promise<void> {
    await this.store.setItem(StorageKeys.deferredChecked, 'true');
  }
}
