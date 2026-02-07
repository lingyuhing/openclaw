import type {
  PluralForms,
  LanguageCode,
} from '../types.js';

/**
 * LanguagePluralizer - Handles pluralization rules for different languages
 * 
 * Different languages have different pluralization rules. This component
 * implements the ICU plural rules for handling plural forms.
 * 
 * Plural categories:
 * - zero: 0
 * - one: 1 (or 21, 31, etc. in some languages)
 * - two: 2 (or 22, 32, etc. in some languages)
 * - few: small numbers (2-4 in Slavic languages)
 * - many: larger numbers
 * - other: default/fallback
 * 
 * @example
 * ```typescript
 * const pluralizer = new LanguagePluralizer();
 * 
 * // English rules
 * const forms: PluralForms = {
 *   one: '{{count}} item',
 *   other: '{{count}} items'
 * };
 * 
 * pluralizer.pluralize(1, forms, 'en'); // "1 item"
 * pluralizer.pluralize(5, forms, 'en'); // "5 items"
 * 
 * // Polish rules (more complex)
 * const polishForms: PluralForms = {
 *   one: '{{count}} element',
 *   few: '{{count}} elementy',
 *   many: '{{count}} elementów',
 *   other: '{{count}} elementu'
 * };
 * ```
 */
export class LanguagePluralizer {
  /** Map of language codes to their plural rule functions */
  private pluralRules: Map<LanguageCode, (n: number) => string>;

  constructor() {
    this.pluralRules = new Map();
    this.initializeRules();
  }

  /**
   * Pluralize a count using the appropriate forms for the language
   * 
   * @param count - The number to pluralize
   * @param forms - Object containing plural form strings
   * @param language - Language code (optional, defaults to detecting from context)
   * @returns The appropriate plural form string
   */
  pluralize(count: number, forms: PluralForms, language?: LanguageCode): string {
    const rule = this.getPluralRule(language ?? 'en');
    const category = rule(count);
    
    // Get the form for this category, falling back through categories
    const form = this.selectForm(count, forms, category);
    
    // Replace {{count}} with the actual count
    return form.replace(/\{\{count\}\}/g, String(count));
  }

  /**
   * Select the appropriate plural form based on category
   */
  private selectForm(
    count: number,
    forms: PluralForms,
    category: string
  ): string {
    // Try the specific category first
    if (category in forms && forms[category as keyof PluralForms]) {
      return forms[category as keyof PluralForms]!;
    }

    // Fall back through categories based on count and available forms
    if (count === 0 && forms.zero) {
      return forms.zero;
    }
    if (count === 1 && forms.one) {
      return forms.one;
    }
    if (count === 2 && forms.two) {
      return forms.two;
    }
    if (forms.few) {
      return forms.few;
    }
    if (forms.many) {
      return forms.many;
    }
    
    // Ultimate fallback
    return forms.other;
  }

  /**
   * Get the plural rule function for a language
   */
  private getPluralRule(language: LanguageCode): (n: number) => string {
    const normalizedLang = language.split('-')[0] ?? language;
    
    // Check for exact match first
    if (this.pluralRules.has(language)) {
      return this.pluralRules.get(language)!;
    }
    
    // Check for base language match
    if (this.pluralRules.has(normalizedLang)) {
      return this.pluralRules.get(normalizedLang)!;
    }
    
    // Default to English rules
    return this.pluralRules.get('en')!;
  }

  /**
   * Select the appropriate plural category for a count based on the rule
   */
  selectPluralRule(count: number, language: LanguageCode): string {
    const rule = this.getPluralRule(language);
    return rule(count);
  }

  /**
   * Add a custom plural rule for a language
   * 
   * @param language - Language code
   * @param rule - Function that returns the plural category for a number
   */
  addPluralRule(
    language: LanguageCode,
    rule: (n: number) => string
  ): void {
    this.pluralRules.set(language, rule);
  }

  /**
   * Initialize standard plural rules for common languages
   * Based on CLDR plural rules: http://cldr.unicode.org/index/cldr-spec/plural-rules
   */
  private initializeRules(): void {
    // English, German, Italian, Spanish, etc.
    // one: n is 1
    // other: everything else
    this.pluralRules.set('en', (n) => n === 1 ? 'one' : 'other');
    this.pluralRules.set('de', (n) => n === 1 ? 'one' : 'other');
    this.pluralRules.set('it', (n) => n === 1 ? 'one' : 'other');
    this.pluralRules.set('es', (n) => n === 1 ? 'one' : 'other');
    this.pluralRules.set('pt', (n) => n === 1 ? 'one' : 'other');
    this.pluralRules.set('nl', (n) => n === 1 ? 'one' : 'other');
    this.pluralRules.set('sv', (n) => n === 1 ? 'one' : 'other');

    // French, Brazilian Portuguese
    // one: n is 0 or 1
    // other: everything else
    this.pluralRules.set('fr', (n) => (n === 0 || n === 1) ? 'one' : 'other');

    // Chinese, Japanese, Korean (no plural distinction)
    // other: everything
    this.pluralRules.set('zh', () => 'other');
    this.pluralRules.set('ja', () => 'other');
    this.pluralRules.set('ko', () => 'other');
    this.pluralRules.set('vi', () => 'other');

    // Russian, Polish, Czech, Slovak (Slavic languages)
    // one: n % 10 is 1 and n % 100 is not 11
    // few: n % 10 is 2-4 and n % 100 is not 12-14
    // many: n % 10 is 0 or 5-9 or n % 100 is 11-14
    // other: everything else (fallback)
    this.pluralRules.set('ru', this.slavicPluralRule);
    this.pluralRules.set('pl', this.slavicPluralRule);
    this.pluralRules.set('cs', this.slavicPluralRule);
    this.pluralRules.set('sk', this.slavicPluralRule);

    // Arabic (complex plural rules)
    // zero: n is 0
    // one: n is 1
    // two: n is 2
    // few: n % 100 is 3-10
    // many: n % 100 is 11-99
    // other: everything else
    this.pluralRules.set('ar', (n) => {
      if (n === 0) {
        return 'zero';
      }
      if (n === 1) {
        return 'one';
      }
      if (n === 2) {
        return 'two';
      }
      const mod100 = n % 100;
      if (mod100 >= 3 && mod100 <= 10) {
        return 'few';
      }
      if (mod100 >= 11 && mod100 <= 99) {
        return 'many';
      }
      return 'other';
    });
  }

  /**
   * Slavic plural rule (Russian, Polish, Czech, etc.)
   */
  private slavicPluralRule(n: number): string {
    const mod10 = n % 10;
    const mod100 = n % 100;

    if (mod10 === 1 && mod100 !== 11) {
      return 'one';
    }
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
      return 'few';
    }
    if (mod10 === 0 || (mod10 >= 5 && mod10 <= 9) || (mod100 >= 11 && mod100 <= 14)) {
      return 'many';
    }
    return 'other';
  }
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
      return 'few';
    }
    if (mod10 === 0 || (mod10 >= 5 && mod10 <= 9) || (mod100 >= 11 && mod100 <= 14)) {
      return 'many';
    }
    return 'other';
  }
}

// Export singleton instance
export const languagePluralizer = new LanguagePluralizer();
