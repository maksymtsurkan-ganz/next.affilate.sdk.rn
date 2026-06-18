import type { KeyValueStore } from '../src/storage';

/** In-memory {@link KeyValueStore} for tests. */
export class MemoryStore implements KeyValueStore {
  readonly map = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.map.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.map.delete(key);
  }
}

/** Builds a minimal mock `Response` with a `Location` header. */
export function mockRedirectResponse(location: string | null): Response {
  const headers = new Map<string, string>();
  if (location !== null) {
    headers.set('location', location);
  }
  return {
    headers: {
      get: (name: string) => headers.get(name.toLowerCase()) ?? null,
    },
  } as unknown as Response;
}

/** Builds a minimal mock JSON `Response`. */
export function mockJsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
    headers: { get: () => null },
  } as unknown as Response;
}
