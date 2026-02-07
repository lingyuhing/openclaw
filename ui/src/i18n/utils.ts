/**
 * Interpolator implementation for variable substitution
 * Supports {{variable}} syntax
 */
export interface Interpolator {
  interpolate(text: string, params: Record<string, string | number>): string;
}

export class SimpleInterpolator implements Interpolator {
  interpolate(text: string, params: Record<string, string | number>): string {
    let result = text;

    for (const [key, value] of Object.entries(params)) {
      const placeholder = `{{${key}}}`;
      // Use split/join for broader compatibility
      result = result.split(placeholder).join(String(value));
    }

    return result;
  }
}

/**
 * Flatten nested object to dot-notation keys
 * Example: { a: { b: 'c' } } => { 'a.b': 'c' }
 */
export function flattenTranslations(
  obj: Record<string, unknown>,
  prefix = "",
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string") {
      result[newKey] = value;
    } else if (typeof value === "object" && value !== null) {
      Object.assign(result, flattenTranslations(value as Record<string, unknown>, newKey));
    }
  }

  return result;
}

/**
 * Check if a language code is supported
 */
export function isSupportedLanguage(lang: string, supportedLangs: string[]): boolean {
  // Exact match
  if (supportedLangs.includes(lang)) {
    return true;
  }

  // Check base language (e.g., "zh-CN" -> "zh")
  const baseLang = lang.split("-")[0];
  return supportedLangs.includes(baseLang);
}

/**
 * Get best matching supported language
 */
export function getBestMatchLanguage(
  preferredLang: string,
  supportedLangs: string[],
  defaultLang: string,
): string {
  // Direct match
  if (supportedLangs.includes(preferredLang)) {
    return preferredLang;
  }

  // Base language match (e.g., "zh-CN" -> "zh")
  const baseLang = preferredLang.split("-")[0];
  if (supportedLangs.includes(baseLang)) {
    return baseLang;
  }

  return defaultLang;
}
