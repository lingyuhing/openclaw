import type { TranslationLoader } from "./types.js";
import { flattenTranslations } from "./utils.js";

/**
 * HTTP-based translation loader
 * Fetches JSON translation files from the server
 */
export class HttpTranslationLoader implements TranslationLoader {
  private cache: Map<string, Record<string, string>> = new Map();
  private loadingPromises: Map<string, Promise<Record<string, string>>> = new Map();

  constructor(private baseUrl = "/i18n") {}

  async load(lang: string): Promise<Record<string, string>> {
    // Check cache first
    const cached = this.cache.get(lang);
    if (cached) {
      return cached;
    }

    // Check if already loading
    const existingPromise = this.loadingPromises.get(lang);
    if (existingPromise) {
      return existingPromise;
    }

    // Start loading
    const loadPromise = this.fetchTranslations(lang);
    this.loadingPromises.set(lang, loadPromise);

    try {
      const result = await loadPromise;
      return result;
    } finally {
      this.loadingPromises.delete(lang);
    }
  }

  private async fetchTranslations(lang: string): Promise<Record<string, string>> {
    try {
      const response = await fetch(`${this.baseUrl}/${lang}.json`);

      if (!response.ok) {
        throw new Error(
          `Failed to load translations for "${lang}": ${response.status} ${response.statusText}`,
        );
      }

      const data = (await response.json()) as Record<string, unknown>;
      const flattened = flattenTranslations(data);

      // Cache the result
      this.cache.set(lang, flattened);

      return flattened;
    } catch (error) {
      console.error(`[i18n] Failed to load translations for "${lang}":`, error);
      // Return empty object on error to prevent crashes
      return {};
    }
  }

  /**
   * Preload a language without waiting for the result
   */
  preload(lang: string): void {
    this.load(lang).catch((error) => {
      console.warn(`[i18n] Preload failed for "${lang}":`, error);
    });
  }

  /**
   * Clear the cache for a specific language or all languages
   */
  clearCache(lang?: string): void {
    if (lang) {
      this.cache.delete(lang);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Check if a language is cached
   */
  isCached(lang: string): boolean {
    return this.cache.has(lang);
  }
}

/**
 * Create a translation loader that fetches from a custom URL
 */
export function createTranslationLoader(baseUrl = "/i18n"): TranslationLoader {
  return new HttpTranslationLoader(baseUrl);
}
