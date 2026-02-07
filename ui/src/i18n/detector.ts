import type { LanguageDetector, StorageManager } from "./types.js";
import { getBestMatchLanguage } from "./utils.js";

/**
 * Browser-based language detector
 * Detects language from localStorage, browser settings, or falls back to default
 */
export class BrowserLanguageDetector implements LanguageDetector {
  constructor(
    private storage: StorageManager,
    private supportedLangs: string[] = ["en", "zh"],
    private defaultLang = "en",
  ) {}

  detect(): string {
    // 1. Check localStorage for saved preference
    const saved = this.storage.get("i18n-lang");
    if (saved && this.supportedLangs.includes(saved)) {
      return saved;
    }

    // 2. Check browser language
    if (typeof navigator !== "undefined") {
      const browserLang = navigator.language.toLowerCase();
      const matchedLang = getBestMatchLanguage(browserLang, this.supportedLangs, this.defaultLang);
      return matchedLang;
    }

    // 3. Fall back to default
    return this.defaultLang;
  }
}

/**
 * Simple language detector that always returns a fixed language
 * Useful for testing or SSR
 */
export class StaticLanguageDetector implements LanguageDetector {
  constructor(private lang: string) {}

  detect(): string {
    return this.lang;
  }
}

/**
 * Create a language detector that tries multiple strategies
 */
export function createLanguageDetector(
  storage: StorageManager,
  supportedLangs: string[] = ["en", "zh"],
  defaultLang = "en",
): LanguageDetector {
  return new BrowserLanguageDetector(storage, supportedLangs, defaultLang);
}
