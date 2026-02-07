import type { I18nCore, I18nConfig } from "./types.js";
import { BrowserLanguageDetector } from "./detector.js";
import { I18nCoreImpl } from "./i18n-core.js";
import { HttpTranslationLoader } from "./loader.js";
import { LocalStorageManager } from "./storage.js";

// Default configuration
const DEFAULT_CONFIG: I18nConfig = {
  defaultLang: "en",
  supportedLangs: ["en", "zh"],
  storageKey: "i18n-lang",
  baseUrl: "/i18n",
};

// Global i18n instance
let i18nInstance: I18nCore | null = null;

/**
 * Initialize the i18n system
 * Should be called once at application startup
 */
export async function initI18n(config: Partial<I18nConfig> = {}): Promise<I18nCore> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  const storage = new LocalStorageManager();
  const loader = new HttpTranslationLoader(mergedConfig.baseUrl);
  const detector = new BrowserLanguageDetector(
    storage,
    mergedConfig.supportedLangs,
    mergedConfig.defaultLang,
  );

  // Create the i18n core
  const i18n = new I18nCoreImpl({
    loader,
    storage,
    defaultLang: mergedConfig.defaultLang,
  });

  // Detect and set initial language
  const detectedLang = detector.detect();
  if (mergedConfig.supportedLangs.includes(detectedLang)) {
    await i18n.setLanguage(detectedLang);
  }

  // Preload other supported languages
  for (const lang of mergedConfig.supportedLangs) {
    if (lang !== detectedLang) {
      // Fire and forget - don't block startup
      i18n.preloadLanguage(lang).catch(() => {
        // Silently ignore preload errors
      });
    }
  }

  i18nInstance = i18n;
  return i18n;
}

/**
 * Get the global i18n instance
 * Throws if initI18n() hasn't been called
 */
export function getI18n(): I18nCore {
  if (!i18nInstance) {
    throw new Error("i18n not initialized. Call initI18n() before using getI18n()");
  }
  return i18nInstance;
}

/**
 * Check if i18n has been initialized
 */
export function isI18nInitialized(): boolean {
  return i18nInstance !== null;
}

/**
 * Reset the i18n instance (mainly for testing)
 */
export function resetI18n(): void {
  i18nInstance = null;
}

// Re-export types
export type {
  I18nCore,
  I18nConfig,
  TranslationLoader,
  LanguageDetector,
  StorageManager,
  Interpolator,
} from "./types.js";

// Re-export implementations
export { I18nCoreImpl } from "./i18n-core.js";

export { HttpTranslationLoader, createTranslationLoader } from "./loader.js";

export {
  BrowserLanguageDetector,
  StaticLanguageDetector,
  createLanguageDetector,
} from "./detector.js";

export { LocalStorageManager, MemoryStorageManager } from "./storage.js";

export {
  SimpleInterpolator,
  flattenTranslations,
  isSupportedLanguage,
  getBestMatchLanguage,
} from "./utils.js";
