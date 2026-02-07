// Main CLI i18n module - Simplified API exports

// Core types
export type {
  LanguageCode,
  TranslationKey,
  TranslationData,
  InterpolationParams,
  PluralForms,
  I18nConfig,
  UserI18nConfig,
  I18nAPI,
  ConfigAPI,
  UtilsAPI,
  Loader,
} from "./types.js";

// Core functionality
export { CliI18nInstance, createI18nInstance } from "./core/instance.js";

export { KeyTranslator, createKeyTranslator } from "./core/translator.js";

export { VariableInterpolator } from "./core/interpolator.js";

export { LanguagePluralizer } from "./core/pluralizer.js";

export {
  InMemoryTranslationLoader,
  FileTranslationLoader,
  createInMemoryLoader,
  createFileLoader,
} from "./core/loader.js";

// Detection
export {
  CliArgumentDetector,
  CliEnvironmentDetector,
  CliConfigDetector,
  DefaultFallbackDetector,
  DetectionOrchestrator,
  createDetectionOrchestrator,
  quickDetect,
} from "./detection/index.js";

// Services
export { FileConfigService } from "./services/config-service.js";
export { DefaultLanguageService } from "./services/language-service.js";
export { DefaultFormatService } from "./services/format-service.js";

// Errors
export {
  I18nError,
  TranslationNotFoundError,
  LanguageNotSupportedError,
  ConfigValidationError,
} from "./types.js";

// Configuration constants
export { DEFAULT_I18N_CONFIG } from "./types.js";
