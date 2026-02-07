/**
 * CLI i18n types and interfaces
 * Based on C4 Model Design - CLI Internationalization
 */

export interface I18nCore {
  /** Current language code */
  readonly currentLang: string;

  /** Get translation by key */
  t(key: string, params?: Record<string, string | number>): string;

  /** Switch language */
  setLanguage(lang: string): void;

  /** Check if key exists */
  has(key: string): boolean;
}

export interface TranslationLoader {
  load(lang: string): Record<string, string> | Promise<Record<string, string>>;
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
  translationsDir: string;
}

export const DEFAULT_CONFIG: I18nConfig = {
  defaultLang: "en",
  supportedLangs: ["en", "zh"],
  storageKey: "openclaw-cli-lang",
  translationsDir: "./locales",
};

/** CLI-specific translation keys */
export type CliTranslationKeys =
  | `commands.${string}.description`
  | `commands.${string}.options.${string}`
  | `commands.${string}.subcommands.${string}.description`
  | `common.errors.${string}`
  | `common.messages.${string}`
  | `common.prompts.${string}`
  | `meta.language`
  | `meta.locale`;
