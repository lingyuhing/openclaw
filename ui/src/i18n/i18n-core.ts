import type { I18nCore, Interpolator, StorageManager, TranslationLoader } from "./types.js";
import { SimpleInterpolator } from "./utils.js";

/**
 * I18n Core Implementation
 * Main translation engine following the C4 Model design
 */
export class I18nCoreImpl implements I18nCore {
  private _currentLang = "en";
  private translations: Map<string, Record<string, string>> = new Map();
  private listeners: Set<(lang: string) => void> = new Set();
  private interpolator: Interpolator;
  private loader: TranslationLoader;
  private storage: StorageManager;

  constructor(options: {
    loader: TranslationLoader;
    storage: StorageManager;
    interpolator?: Interpolator;
    defaultLang?: string;
  }) {
    this.loader = options.loader;
    this.storage = options.storage;
    this.interpolator = options.interpolator ?? new SimpleInterpolator();
    this._currentLang = options.defaultLang ?? "en";
  }

  get currentLang(): string {
    return this._currentLang;
  }

  async setLanguage(lang: string): Promise<void> {
    if (lang === this._currentLang) return;

    // Load translations if not cached
    if (!this.translations.has(lang)) {
      try {
        const translations = await this.loader.load(lang);
        this.translations.set(lang, translations);
      } catch (error) {
        console.warn(`Failed to load translations for ${lang}:`, error);
        // If we can't load the new language, keep the current one
        return;
      }
    }

    this._currentLang = lang;
    this.storage.set("i18n-lang", lang);

    // Notify all listeners
    this.listeners.forEach((callback) => {
      try {
        callback(lang);
      } catch (error) {
        console.error("Error in language change listener:", error);
      }
    });
  }

  t(key: string, params?: Record<string, string | number>): string {
    const translations = this.translations.get(this._currentLang);

    if (!translations) {
      return key;
    }

    let text = translations[key];

    // If key not found, return the key itself
    if (text === undefined) {
      return key;
    }

    // Handle parameter interpolation
    if (params) {
      text = this.interpolator.interpolate(text, params);
    }

    return text;
  }

  onLanguageChange(callback: (lang: string) => void): () => void {
    this.listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Preload a language without switching to it
   */
  async preloadLanguage(lang: string): Promise<void> {
    if (this.translations.has(lang)) return;

    try {
      const translations = await this.loader.load(lang);
      this.translations.set(lang, translations);
    } catch (error) {
      console.warn(`Failed to preload translations for ${lang}:`, error);
    }
  }

  /**
   * Check if translations are loaded for a language
   */
  isLanguageLoaded(lang: string): boolean {
    return this.translations.has(lang);
  }

  /**
   * Get all loaded translation keys for current language
   */
  getLoadedKeys(): string[] {
    const translations = this.translations.get(this._currentLang);
    return translations ? Object.keys(translations) : [];
  }
}

/**
 * Create a new I18nCore instance
 */
export function createI18nCore(options: {
  loader: TranslationLoader;
  storage: StorageManager;
  interpolator?: Interpolator;
  defaultLang?: string;
}): I18nCore {
  return new I18nCoreImpl(options);
}
