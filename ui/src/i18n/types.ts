/**
 * i18n types and interfaces
 * Based on C4 Model Design - UI Internationalization
 */

export interface I18nCore {
  /** Current language code */
  readonly currentLang: string;

  /** Get translation by key */
  t(key: string, params?: Record<string, string | number>): string;

  /** Switch language */
  setLanguage(lang: string): Promise<void>;

  /** Listen to language changes */
  onLanguageChange(callback: (lang: string) => void): () => void;
}

export interface TranslationLoader {
  load(lang: string): Promise<Record<string, string>>;
}

export interface LanguageDetector {
  detect(): string;
}

export interface StorageManager {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export interface Interpolator {
  interpolate(text: string, params: Record<string, string | number>): string;
}

export interface I18nConfig {
  defaultLang: string;
  supportedLangs: string[];
  storageKey: string;
  baseUrl: string;
}

export const DEFAULT_CONFIG: I18nConfig = {
  defaultLang: "en",
  supportedLangs: ["en", "zh"],
  storageKey: "i18n-lang",
  baseUrl: "/i18n",
};
