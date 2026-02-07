import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createI18nInstance,
  createKeyTranslator,
  quickDetect,
  type CliI18nInstance,
  type KeyTranslator,
  type Loader,
} from "./i18n/index.js";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");

let _i18nInstance: CliI18nInstance | null = null;
let _translator: KeyTranslator | null = null;
let _loader: Loader | null = null;

export const i18nRuntime = {
  async init() {
    if (_i18nInstance) {
      return;
    }

    const detectionResult = quickDetect();
    const i18nInstance = createI18nInstance({
      defaultLanguage: detectionResult.language,
      fallbackLanguage: "en",
    });

    const { createFileLoader } = await import("./i18n/core/loader.js");
    const loader = createFileLoader(resolve(__dirname, "i18n", "locales"));
    const translator = createKeyTranslator(i18nInstance);

    try {
      const translations = await loader.load(detectionResult.language);
      translator.addResource(detectionResult.language, translations);
    } catch (error) {
      console.warn(`Failed to load translations for ${detectionResult.language}:`, error);
    }

    try {
      const fallbackTranslations = await loader.load("en");
      translator.addResource("en", fallbackTranslations);
    } catch (error) {
      console.warn("Failed to load fallback translations:", error);
    }

    _i18nInstance = i18nInstance;
    _translator = translator;
    _loader = loader;
  },

  getInstance() {
    return _i18nInstance;
  },

  getTranslator() {
    return _translator;
  },

  t(key: string, params?: Record<string, string | number>): string {
    try {
      return _translator?.translate(key, params) ?? key;
    } catch {
      return key;
    }
  },

  async setLanguage(lang: string): Promise<void> {
    if (!_i18nInstance) {
      return;
    }
    await _i18nInstance.changeLanguage(lang);

    try {
      if (_loader) {
        const translations = await _loader.load(lang);
        _translator?.addResource(lang, translations);
      }
    } catch (error) {
      console.warn(`Failed to load translations for ${lang}:`, error);
    }
  },

  getCurrentLanguage(): string {
    return _i18nInstance?.currentLanguage ?? "en";
  },

  isInitialized(): boolean {
    return _i18nInstance !== null;
  },
};

// Export the t function for direct import
export function t(key: string, params?: Record<string, string | number>): string {
  return i18nRuntime.t(key, params);
}
