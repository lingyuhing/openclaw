import type { I18nInstance, LanguageCode, EventCallback } from "../types.js";

/**
 * I18nInstance - Core i18n instance managing language state
 *
 * This is the central piece of the i18n core engine. It manages:
 * - Current language state
 * - Fallback language configuration
 * - Language change event handling
 *
 * @example
 * ```typescript
 * const instance = new CliI18nInstance({
 *   defaultLanguage: 'en',
 *   fallbackLanguage: 'en'
 * });
 *
 * // Subscribe to language changes
 * const unsubscribe = instance.onLanguageChanged((lang) => {
 *   console.log(`Language changed to: ${lang}`);
 * });
 *
 * // Change language
 * await instance.changeLanguage('zh-CN');
 *
 * // Cleanup
 * unsubscribe();
 * ```
 */
export class CliI18nInstance implements I18nInstance {
  /** Current active language */
  private _currentLanguage: LanguageCode;

  /** Fallback language when translation is missing */
  private _fallbackLanguage: LanguageCode;

  /** Event callbacks for language change */
  private _callbacks: Set<EventCallback<LanguageCode>> = new Set();

  /** Whether a language change is in progress */
  private _changing = false;

  constructor(config?: { defaultLanguage?: LanguageCode; fallbackLanguage?: LanguageCode }) {
    this._currentLanguage = config?.defaultLanguage ?? "en";
    this._fallbackLanguage = config?.fallbackLanguage ?? "en";
  }

  /**
   * Get the current language
   */
  get currentLanguage(): LanguageCode {
    return this._currentLanguage;
  }

  /**
   * Get the fallback language
   */
  get fallbackLanguage(): LanguageCode {
    return this._fallbackLanguage;
  }

  /**
   * Set the fallback language
   */
  set fallbackLanguage(lang: LanguageCode) {
    this._fallbackLanguage = lang;
  }

  /**
   * Change the current language
   *
   * This method:
   * 1. Validates the language code
   * 2. Triggers the change event
   * 3. Updates the current language state
   * 4. Notifies all subscribers
   */
  async changeLanguage(lang: LanguageCode): Promise<void> {
    // Normalize the language code
    const normalizedLang = this.normalizeLanguageCode(lang);

    // Check if already the current language
    if (normalizedLang === this._currentLanguage) {
      return;
    }

    // Prevent concurrent changes
    if (this._changing) {
      throw new Error("Language change already in progress");
    }

    this._changing = true;

    try {
      // Update current language
      this._currentLanguage = normalizedLang;

      // Notify all subscribers
      this._callbacks.forEach((callback) => {
        try {
          callback(this._currentLanguage);
        } catch (error) {
          console.error("Error in language change callback:", error);
        }
      });
    } finally {
      this._changing = false;
    }
  }

  /**
   * Get the current language
   * Alias for currentLanguage property
   */
  getLanguage(): LanguageCode {
    return this._currentLanguage;
  }

  /**
   * Subscribe to language change events
   *
   * @param callback - Function to call when language changes
   * @returns Unsubscribe function
   */
  onLanguageChanged(callback: EventCallback<LanguageCode>): () => void {
    this._callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this._callbacks.delete(callback);
    };
  }

  /**
   * Check if a language change is in progress
   */
  get isChanging(): boolean {
    return this._changing;
  }

  /**
   * Get the number of registered callbacks
   */
  get callbackCount(): number {
    return this._callbacks.size;
  }

  /**
   * Clear all callbacks
   */
  clearCallbacks(): void {
    this._callbacks.clear();
  }

  /**
   * Normalize a language code
   *
   * Converts various formats to standard format:
   * - zh_CN -> zh-cn
   * - en_US.UTF-8 -> en
   * - ZH-CN -> zh-cn
   */
  private normalizeLanguageCode(code: string): LanguageCode {
    return code
      .toLowerCase()
      .replace(/_/g, "-")
      .split(".")[0] // Remove encoding suffix
      .trim();
  }
}

// Export singleton instance factory
export function createI18nInstance(config?: {
  defaultLanguage?: LanguageCode;
  fallbackLanguage?: LanguageCode;
}): CliI18nInstance {
  return new CliI18nInstance(config);
}
