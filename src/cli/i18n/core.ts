/**
 * CLI i18n core implementation
 * Follows the same patterns as UI i18n for consistency
 */

import type {
  I18nCore,
  I18nConfig,
  Interpolator,
  StorageManager,
  TranslationLoader,
} from "./types.js";

/**
 * Interpolator for variable substitution
 * Supports {{variable}} syntax
 */
class SimpleInterpolator implements Interpolator {
  interpolate(text: string, params: Record<string, string | number>): string {
    let result = text;

    for (const [key, value] of Object.entries(params)) {
      const placeholder = `{{${key}}}`;
      // Use split/join for broader compatibility
      result = result.split(placeholder).join(String(value));
    }

    return result;
  }
}

/**
 * CLI I18n Core Implementation
 */
export class CliI18nCore implements I18nCore {
  private _currentLang: string;
  private translations: Map<string, Record<string, string>> = new Map();
  private interpolator: Interpolator;
  private config: I18nConfig;

  constructor(options: { config: I18nConfig; interpolator?: Interpolator; initialLang?: string }) {
    this.config = options.config;
    this.interpolator = options.interpolator ?? new SimpleInterpolator();
    this._currentLang = options.initialLang ?? options.config.defaultLang;

    // Load initial language
    this.loadLanguage(this._currentLang);
  }

  get currentLang(): string {
    return this._currentLang;
  }

  private loadLanguage(lang: string): void {
    if (this.translations.has(lang)) {
      return;
    }

    try {
      // Use require to load JSON files synchronously
      const path = require("path");
      const translationsPath = path.join(this.config.translationsDir, `${lang}.json`);
      const translations = require(translationsPath);
      const flattened = this.flattenTranslations(translations);

      // Cache the result
      this.translations.set(lang, flattened);
    } catch (_error) {
      // Silently ignore errors and use empty translations
      this.translations.set(lang, {});
    }
  }

  private flattenTranslations(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === "string") {
        result[newKey] = value;
      } else if (typeof value === "object" && value !== null) {
        Object.assign(result, this.flattenTranslations(value as Record<string, unknown>, newKey));
      }
    }

    return result;
  }

  setLanguage(lang: string): void {
    if (lang === this._currentLang) {
      return;
    }

    // Load new language if not cached
    if (!this.translations.has(lang)) {
      this.loadLanguage(lang);
    }

    this._currentLang = lang;
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

  has(key: string): boolean {
    const translations = this.translations.get(this._currentLang);
    if (!translations) {
      return false;
    }
    return translations[key] !== undefined;
  }

  /**
   * Preload a language without switching to it
   */
  preloadLanguage(lang: string): void {
    if (!this.translations.has(lang)) {
      this.loadLanguage(lang);
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
 * Create a new CLI I18nCore instance
 */
export function createI18nCore(options: {
  config: I18nConfig;
  interpolator?: Interpolator;
  initialLang?: string;
}): I18nCore {
  return new CliI18nCore(options);
}
