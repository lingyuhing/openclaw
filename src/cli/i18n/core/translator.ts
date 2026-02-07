import type {
  Translator,
  TranslationKey,
  InterpolationParams,
  LanguageCode,
  TranslationData,
  I18nInstance,
} from "../types.js";
import { TranslationNotFoundError } from "../types.js";

/**
 * KeyTranslator - Core translation engine for key-value lookup
 *
 * The Translator component is responsible for:
 * - Looking up translation keys in the loaded resources
 * - Handling nested key paths (e.g., "commands.gateway.start.success")
 * - Implementing fallback logic when keys are missing
 * - Delegating variable interpolation to the Interpolator
 *
 * @example
 * ```typescript
 * const translator = new KeyTranslator(i18nInstance, resources);
 *
 * // Simple translation
 * const text = translator.translate('common.hello');
 * // Returns: "Hello" or "你好" depending on current language
 *
 * // With parameters
 * const text = translator.translate('common.welcome', { name: 'John' });
 * // Returns: "Welcome, John!"
 *
 * // Check if key exists
 * if (translator.exists('commands.gateway.start.success')) {
 *   // Key exists in current language or fallback
 * }
 * ```
 */
export class KeyTranslator implements Translator {
  /** Reference to i18n instance for current language state */
  private i18nInstance: I18nInstance;

  /** Translation resources by language code */
  private resources: Map<LanguageCode, TranslationData>;

  /** Whether to throw on missing translations */
  private strictMode = false;

  constructor(i18nInstance: I18nInstance, resources?: Map<LanguageCode, TranslationData>) {
    this.i18nInstance = i18nInstance;
    this.resources = resources ?? new Map();
  }

  /**
   * Translate a key with optional parameters
   *
   * @param key - The translation key (supports nested paths like "commands.gateway.start.success")
   * @param params - Optional parameters for interpolation
   * @returns The translated string
   * @throws TranslationNotFoundError if key doesn't exist and strict mode is enabled
   */
  translate(key: TranslationKey, params?: InterpolationParams): string {
    const currentLang = this.i18nInstance.currentLanguage;
    const fallbackLang = this.i18nInstance.fallbackLanguage;

    // Try current language first
    let translation = this.lookupKey(currentLang, key);

    // If not found, try fallback language
    if (translation === null && fallbackLang !== currentLang) {
      translation = this.lookupKey(fallbackLang, key);
    }

    // If still not found
    if (translation === null) {
      if (this.strictMode) {
        throw new TranslationNotFoundError(key, currentLang);
      }
      // Return the key as fallback
      return key;
    }

    // If parameters provided, do simple interpolation
    if (params && Object.keys(params).length > 0) {
      return this.simpleInterpolate(translation, params);
    }

    return translation;
  }

  /**
   * Check if a translation key exists
   *
   * @param key - The translation key to check
   * @returns true if the key exists in current or fallback language
   */
  exists(key: TranslationKey): boolean {
    const currentLang = this.i18nInstance.currentLanguage;
    const fallbackLang = this.i18nInstance.fallbackLanguage;

    // Check current language
    if (this.lookupKey(currentLang, key) !== null) {
      return true;
    }

    // Check fallback language
    if (fallbackLang !== currentLang) {
      if (this.lookupKey(fallbackLang, key) !== null) {
        return true;
      }
    }

    return false;
  }

  /**
   * Add or update translation resources
   *
   * @param lang - Language code
   * @param data - Translation data
   */
  addResource(lang: LanguageCode, data: TranslationData): void {
    this.resources.set(lang, data);
  }

  /**
   * Remove translation resources for a language
   *
   * @param lang - Language code
   */
  removeResource(lang: LanguageCode): void {
    this.resources.delete(lang);
  }

  /**
   * Check if resources exist for a language
   *
   * @param lang - Language code
   */
  hasResource(lang: LanguageCode): boolean {
    return this.resources.has(lang);
  }

  /**
   * Set strict mode
   * When enabled, missing translations will throw errors instead of returning the key
   */
  setStrictMode(strict: boolean): void {
    this.strictMode = strict;
  }

  /**
   * Get all loaded resources
   */
  getResources(): Map<LanguageCode, TranslationData> {
    return new Map(this.resources);
  }

  /**
   * Lookup a key in the translation data
   * Supports nested keys like "commands.gateway.start.success"
   *
   * @param lang - Language code
   * @param key - Dot-separated key path
   * @returns The translation string or null if not found
   */
  private lookupKey(lang: LanguageCode, key: string): string | null {
    const resources = this.resources.get(lang);
    if (!resources) {
      return null;
    }

    const parts = key.split(".");
    let current: TranslationData | string = resources;

    for (const part of parts) {
      if (current === null || typeof current !== "object") {
        return null;
      }
      current = current[part] as TranslationData | string;
    }

    if (typeof current === "string") {
      return current;
    }

    return null;
  }

  /**
   * Simple variable interpolation
   * Replaces {{variable}} with actual values
   *
   * @param text - Template string with {{placeholders}}
   * @param params - Object with replacement values
   * @returns Interpolated string
   */
  private simpleInterpolate(text: string, params: InterpolationParams): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (key in params) {
        const value = params[key];
        return String(value ?? "");
      }
      return match; // Keep placeholder if key not found
    });
  }
}

// Export singleton factory
export function createKeyTranslator(
  i18nInstance: I18nInstance,
  resources?: Map<LanguageCode, TranslationData>,
): KeyTranslator {
  return new KeyTranslator(i18nInstance, resources);
}
