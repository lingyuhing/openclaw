import type { StorageManager } from "./types.js";

/**
 * Browser localStorage implementation of StorageManager
 */
export class LocalStorageManager implements StorageManager {
  private prefix: string;

  constructor(prefix = "openclaw-") {
    this.prefix = prefix;
  }

  get(key: string): string | null {
    try {
      return localStorage.getItem(this.prefix + key);
    } catch {
      return null;
    }
  }

  set(key: string, value: string): void {
    try {
      localStorage.setItem(this.prefix + key, value);
    } catch (error) {
      console.warn("Failed to save to localStorage:", error);
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch {
      // Ignore errors
    }
  }

  clear(): void {
    try {
      // Only clear items with our prefix
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // Ignore errors
    }
  }
}

/**
 * In-memory storage manager for testing or SSR environments
 */
export class MemoryStorageManager implements StorageManager {
  private store = new Map<string, string>();

  get(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.store.set(key, value);
  }

  remove(key: string): void {
    this.store.delete(key);
  }
}
