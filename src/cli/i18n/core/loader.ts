import type { Loader, LanguageCode, TranslationData } from "../types.js";

/**
 * TranslationLoader - Loads translation resources for languages
 *
 * This component is responsible for:
 * - Loading translation files from various sources (filesystem, network, etc.)
 * - Managing the loading state of languages
 * - Caching loaded resources to avoid repeated loading
 *
 * @example
 * ```typescript
 * const loader = new FileTranslationLoader('./locales');
 *
 * // Load a language
 * const translations = await loader.loadLanguage('zh-CN');
 *
 * // Check if already loaded
 * if (loader.hasLoaded('zh-CN')) {
 *   // Already in memory
 * }
 *
 * // Unload to free memory
 * loader.unload('zh-CN');
 * ```
 */
export interface TranslationLoader extends Loader {
  /**
   * Load translations for a language
   * @param lang - Language code (e.g., 'en', 'zh-CN')
   * @returns Promise resolving to translation data
   */
  loadLanguage(lang: LanguageCode): Promise<TranslationData>;

  /**
   * Check if a language has been loaded
   * @param lang - Language code
   */
  hasLoaded(lang: LanguageCode): boolean;

  /**
   * Unload a language to free memory
   * @param lang - Language code
   */
  unload(lang: LanguageCode): void;

  /**
   * Get list of loaded languages
   */
  getLoadedLanguages(): LanguageCode[];

  /**
   * Unload all languages
   */
  unloadAll(): void;
}

/**
 * InMemoryTranslationLoader - Loads translations from memory
 *
 * This loader is useful for:
 * - Testing
 * - Pre-bundled translations
 * - Small translation sets
 */
export class InMemoryTranslationLoader implements TranslationLoader {
  private resources: Map<LanguageCode, TranslationData> = new Map();

  /**
   * Add translations for a language
   */
  addTranslations(lang: LanguageCode, data: TranslationData): void {
    this.resources.set(lang, data);
  }

  /**
   * Remove translations for a language
   */
  removeTranslations(lang: LanguageCode): void {
    this.resources.delete(lang);
  }

  // Loader interface implementation

  async loadLanguage(lang: LanguageCode): Promise<TranslationData> {
    const data = this.resources.get(lang);
    if (!data) {
      throw new Error(`Translations not found for language: ${lang}`);
    }
    return { ...data }; // Return a copy
  }

  load(lang: LanguageCode): Promise<TranslationData> {
    return this.loadLanguage(lang);
  }

  hasLoaded(lang: LanguageCode): boolean {
    return this.resources.has(lang);
  }

  unload(lang: LanguageCode): void {
    this.resources.delete(lang);
  }

  getLoadedLanguages(): LanguageCode[] {
    return Array.from(this.resources.keys());
  }

  unloadAll(): void {
    this.resources.clear();
  }
}

/**
 * FileTranslationLoader - Loads translations from JSON files
 *
 * This loader reads translation files from the filesystem.
 * It expects JSON files named by language code (e.g., 'en.json', 'zh-CN.json').
 */
export class FileTranslationLoader implements TranslationLoader {
  private basePath: string;
  private loadedLanguages: Set<LanguageCode> = new Set();
  private cache: Map<LanguageCode, TranslationData> = new Map();

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  async loadLanguage(lang: LanguageCode): Promise<TranslationData> {
    // Check cache first
    if (this.cache.has(lang)) {
      return this.cache.get(lang)!;
    }

    const filePath = this.resolveFilePath(lang);

    try {
      const { readFile } = await import("node:fs/promises");
      const content = await readFile(filePath, "utf-8");
      const data = JSON.parse(content) as TranslationData;

      // Cache and mark as loaded
      this.cache.set(lang, data);
      this.loadedLanguages.add(lang);

      return data;
    } catch (error) {
      throw new Error(
        `Failed to load translations for "${lang}" from "${filePath}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  load(lang: LanguageCode): Promise<TranslationData> {
    return this.loadLanguage(lang);
  }

  hasLoaded(lang: LanguageCode): boolean {
    return this.loadedLanguages.has(lang);
  }

  unload(lang: LanguageCode): void {
    this.loadedLanguages.delete(lang);
    this.cache.delete(lang);
  }

  getLoadedLanguages(): LanguageCode[] {
    return Array.from(this.loadedLanguages);
  }

  unloadAll(): void {
    this.loadedLanguages.clear();
    this.cache.clear();
  }

  /**
   * Clear the cache for a specific language or all languages
   */
  clearCache(lang?: LanguageCode): void {
    if (lang) {
      this.cache.delete(lang);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Resolve the file path for a language
   */
  private resolveFilePath(lang: LanguageCode): string {
    const { resolve } = require("node:path");
    return resolve(this.basePath, `${lang}.json`);
  }
}

// Export factory functions
export function createInMemoryLoader(): InMemoryTranslationLoader {
  return new InMemoryTranslationLoader();
}

export function createFileLoader(basePath: string): FileTranslationLoader {
  return new FileTranslationLoader(basePath);
}
