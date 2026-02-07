/**
 * CLI i18n types and interfaces
 * Based on C4 Model Design - CLI Internationalization
 *
 * Architecture Layers:
 * - API Layer: I18nAPI, ConfigAPI, UtilsAPI
 * - Service Layer: ConfigService, LanguageService, FormatService
 * - Core Layer: I18nInstance, Translator, Loader, Formatter
 * - Resource Layer: ResourceLoader, ResourceCache, ResourceMerger
 * - Detection Layer: Detectors (Arg, Env, Config, Fallback)
 */

// ============================================================================
// Core Types
// ============================================================================

export type LanguageCode = string;

export type TranslationKey = string;

export type TranslationValue = string | TranslationData;

export interface TranslationData {
  [key: string]: TranslationValue;
}

export type InterpolationParams = Record<string, string | number>;

export type PluralForms = {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
};

// ============================================================================
// Configuration Types
// ============================================================================

export interface I18nConfig {
  /** Default language code */
  defaultLanguage: LanguageCode;
  /** List of supported languages */
  supportedLanguages: LanguageCode[];
  /** Fallback language when translation is missing */
  fallbackLanguage: LanguageCode;
  /** Path to translations directory */
  translationsDir: string;
  /** Configuration file path */
  configFilePath: string;
  /** Enable caching */
  enableCache: boolean;
  /** Cache size limit */
  cacheMaxSize: number;
}

export interface UserI18nConfig {
  language?: LanguageCode;
  fallbackLanguage?: LanguageCode;
  dateFormat?: string;
  numberFormat?: string;
}

export const DEFAULT_I18N_CONFIG: I18nConfig = {
  defaultLanguage: "en",
  supportedLanguages: ["en", "zh", "zh-TW", "ja", "ko"],
  fallbackLanguage: "en",
  translationsDir: "./locales",
  configFilePath: "~/.config/openclaw/i18n.json",
  enableCache: true,
  cacheMaxSize: 100,
};

// ============================================================================
// API Layer Types
// ============================================================================

export interface I18nAPI {
  /** Translate a key with optional parameters */
  t(key: TranslationKey, params?: InterpolationParams): string;
  /** Change current language */
  changeLanguage(lang: LanguageCode): Promise<void>;
  /** Get current language */
  getLanguage(): LanguageCode;
  /** Subscribe to language change events */
  onLanguageChanged(callback: (lang: LanguageCode) => void): () => void;
  /** Check if key exists */
  exists(key: TranslationKey): boolean;
}

export interface ConfigAPI {
  /** Load user configuration */
  loadConfig(): Promise<UserI18nConfig>;
  /** Save user configuration */
  saveConfig(config: UserI18nConfig): Promise<void>;
  /** Get current configuration */
  getConfig(): UserI18nConfig;
}

export interface UtilsAPI {
  /** Format date according to current locale */
  formatDate(date: Date, format?: string): string;
  /** Format number according to current locale */
  formatNumber(num: number, options?: Intl.NumberFormatOptions): string;
  /** Format relative time (e.g., "2 hours ago") */
  formatRelativeTime(date: Date): string;
  /** Get language name in current locale */
  getLanguageName(code: LanguageCode): string;
}

// ============================================================================
// Service Layer Types
// ============================================================================

export interface ConfigService {
  loadConfig(): Promise<UserI18nConfig>;
  saveConfig(config: UserI18nConfig): Promise<void>;
  getConfig(): UserI18nConfig;
  validateConfig(config: unknown): config is UserI18nConfig;
}

export interface LanguageService {
  getAvailableLanguages(): LanguageCode[];
  getLanguageName(code: LanguageCode): string;
  getLanguageMetadata(code: LanguageCode): LanguageMetadata;
  isLanguageSupported(code: LanguageCode): boolean;
}

export interface FormatService {
  formatDate(date: Date, format?: string): string;
  formatNumber(num: number, options?: Intl.NumberFormatOptions): string;
  formatRelativeTime(date: Date): string;
  formatCurrency(amount: number, currency: string): string;
}

// ============================================================================
// Core Layer Types
// ============================================================================

export interface I18nInstance {
  currentLanguage: LanguageCode;
  fallbackLanguage: LanguageCode;
  changeLanguage(lang: LanguageCode): Promise<void>;
  getLanguage(): LanguageCode;
  onLanguageChanged(callback: (lang: LanguageCode) => void): () => void;
}

export interface Translator {
  translate(key: TranslationKey, params?: InterpolationParams): string;
  exists(key: TranslationKey): boolean;
}

export interface Loader {
  loadLanguage(lang: LanguageCode): Promise<TranslationData>;
  hasLoaded(lang: LanguageCode): boolean;
  unload(lang: LanguageCode): void;
}

export interface Formatter {
  format(text: string, params: InterpolationParams): string;
  formatPlural(count: number, forms: PluralForms): string;
  escapeHtml(text: string): string;
  unescapeHtml(text: string): string;
}

export interface Pluralizer {
  pluralize(count: number, forms: PluralForms, language?: LanguageCode): string;
  selectPluralRule(count: number, language: LanguageCode): string;
  addPluralRule(language: LanguageCode, rule: (n: number) => string): void;
}

// ============================================================================
// Resource Layer Types
// ============================================================================

export interface ResourceLoader {
  loadResource(lang: LanguageCode): Promise<TranslationData>;
  resolvePath(lang: LanguageCode): string;
  parseResource(content: string): TranslationData;
}

export interface ResourceCache {
  get(lang: LanguageCode): TranslationData | undefined;
  set(lang: LanguageCode, data: TranslationData): void;
  has(lang: LanguageCode): boolean;
  clear(): void;
  delete(lang: LanguageCode): boolean;
}

export interface ResourceMerger {
  merge(target: TranslationData, source: TranslationData): TranslationData;
  mergeWithFallback(primary: TranslationData, fallback: TranslationData): TranslationData;
  flatten(data: TranslationData, prefix?: string): Record<string, string>;
}

// ============================================================================
// Detection Layer Types
// ============================================================================

export interface Detector {
  detect(): LanguageCode | null;
  priority: number;
  name: string;
}

export interface DetectionResult {
  language: LanguageCode;
  source: string;
  priority: number;
}

export interface Detectors {
  argument: ArgumentDetector;
  environment: EnvironmentDetector;
  config: ConfigDetector;
  fallback: FallbackDetector;
}

export interface ArgumentDetector extends Detector {
  parseArgs(args: string[]): LanguageCode | null;
}

export interface EnvironmentDetector extends Detector {
  readEnv(): LanguageCode | null;
  envVars: string[];
}

export interface ConfigDetector extends Detector {
  readConfig(): Promise<UserI18nConfig | null>;
  configPath: string;
}

export interface FallbackDetector extends Detector {
  defaultLanguage: LanguageCode;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface LanguageMetadata {
  code: LanguageCode;
  name: string;
  nativeName: string;
  rtl: boolean;
  pluralRule: string;
}

export type EventCallback<T> = (data: T) => void;

export interface EventEmitter<T> {
  on(event: string, callback: EventCallback<T>): () => void;
  emit(event: string, data: T): void;
  off(event: string, callback: EventCallback<T>): void;
}

// ============================================================================
// Error Types
// ============================================================================

export class I18nError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "I18nError";
  }
}

export class TranslationNotFoundError extends I18nError {
  constructor(key: string, lang: string) {
    super(`Translation not found for key "${key}" in language "${lang}"`, "TRANSLATION_NOT_FOUND", {
      key,
      lang,
    });
  }
}

export class LanguageNotSupportedError extends I18nError {
  constructor(lang: string) {
    super(`Language "${lang}" is not supported`, "LANGUAGE_NOT_SUPPORTED", { lang });
  }
}

export class ConfigValidationError extends I18nError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "CONFIG_VALIDATION_ERROR", details);
  }
}
