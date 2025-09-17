import { CacheItem } from "./types";

export class SearchCache {
  private cache = new Map<string, CacheItem>();
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor(private defaultTTL: number = 60_000) {
    // Clean up expired items every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60_000);
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  async set<T>(
    key: string,
    data: T,
    ttlMs?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    const expires = Date.now() + (ttlMs ?? this.defaultTTL);

    this.cache.set(key, {
      data,
      expires,
      metadata,
    });
  }

  async has(key: string): Promise<boolean> {
    const item = this.cache.get(key);

    if (!item) {
      return false;
    }

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): { size: number; hitRate?: number } {
    return {
      size: this.cache.size,
      // TODO: Add hit rate tracking if needed
    };
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.clear();
  }
}

// Singleton instance
export const searchCache = new SearchCache();
