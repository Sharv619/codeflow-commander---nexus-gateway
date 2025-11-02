// ------------------------------------------------------------------------------
// Phase 5: Storage Layer - Storage Manager Implementation
// Multi-layer storage for agent state, learning data, and configuration
// ------------------------------------------------------------------------------
export class StorageManager {
  private cache: Map<string, any> = new Map();

  async get<T>(key: string): Promise<T | null> {
    return this.cache.get(key) || null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    this.cache.set(key, value);

    if (ttl) {
      setTimeout(() => {
        this.cache.delete(key);
      }, ttl);
    }
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async list(namespace?: string): Promise<string[]> {
    const keys = Array.from(this.cache.keys());
    return namespace ? keys.filter(key => key.startsWith(namespace)) : keys;
  }

  async search(pattern: string): Promise<string[]> {
    const keys = Array.from(this.cache.keys());
    const regex = new RegExp(pattern);
    return keys.filter(key => regex.test(key));
  }
}
