import type { FallbackDetector, LanguageCode } from "../types.js";

/**
 * FallbackDetector - Provides default language when all other detectors fail
 *
 * This is the final fallback in the detection chain. It always returns
 * the configured default language (typically 'en' for English).
 *
 * Priority: Lowest (last resort)
 *
 * @example
 * When no language is detected from:
 * - Command line arguments (--lang)
 * - Environment variables (OPENCLAW_LANG, LANG, etc.)
 * - Configuration file (~/.config/openclaw/i18n.json)
 *
 * Then FallbackDetector returns 'en' (or configured default)
 */
export class DefaultFallbackDetector implements FallbackDetector {
  readonly name = "fallback";
  readonly priority = 999; // Lowest priority, always last

  private readonly _defaultLanguage: LanguageCode;

  constructor(defaultLanguage: LanguageCode = "en") {
    this._defaultLanguage = defaultLanguage;
  }

  /**
   * Detect language - always returns the default
   */
  detect(): LanguageCode {
    return this._defaultLanguage;
  }

  /**
   * Get the default language
   */
  get defaultLanguage(): LanguageCode {
    return this._defaultLanguage;
  }

  /**
   * Create a new fallback detector with different default
   */
  withDefault(defaultLanguage: LanguageCode): DefaultFallbackDetector {
    return new DefaultFallbackDetector(defaultLanguage);
  }
}

// Export singleton instance with English as default
export const fallbackDetector = new DefaultFallbackDetector("en");
