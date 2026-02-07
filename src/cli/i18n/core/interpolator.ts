import type { Interpolator, InterpolationParams } from "../types.js";

/**
 * VariableInterpolator - Handles variable interpolation and escaping
 *
 * This component replaces placeholder variables in translation strings
 * with actual values. It supports:
 * - Simple variable substitution: {{name}}
 * - HTML escaping (optional)
 * - Default values for missing variables
 *
 * @example
 * ```typescript
 * const interpolator = new VariableInterpolator();
 *
 * // Simple interpolation
 * const result = interpolator.interpolate(
 *   'Hello, {{name}}!',
 *   { name: 'World' }
 * );
 * // Returns: "Hello, World!"
 *
 * // With HTML escaping
 * const result = interpolator.interpolate(
 *   'Hello, {{name}}!',
 *   { name: '<script>alert("xss")</script>' },
 *   { escape: true }
 * );
 * // Returns: "Hello, &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;!"
 * ```
 */
export class VariableInterpolator implements Interpolator {
  /** Default placeholder regex pattern */
  private readonly placeholderPattern = /\{\{(\w+)\}\}/g;

  /**
   * Interpolate variables into a template string
   *
   * @param text - Template string with {{placeholders}}
   * @param params - Object with replacement values
   * @returns Interpolated string
   */
  interpolate(text: string, params: InterpolationParams): string {
    return this.interpolateWithOptions(text, params, { escape: false });
  }

  /**
   * Interpolate with options
   *
   * @param text - Template string
   * @param params - Replacement values
   * @param options - Interpolation options
   * @returns Interpolated string
   */
  interpolateWithOptions(
    text: string,
    params: InterpolationParams,
    options: { escape?: boolean; defaultValue?: string } = {},
  ): string {
    const { escape = false, defaultValue = "" } = options;

    return text.replace(this.placeholderPattern, (match, key) => {
      if (key in params) {
        const value = params[key];
        if (value === null || value === undefined) {
          return defaultValue;
        }

        const stringValue = String(value);
        return escape ? this.escapeHtml(stringValue) : stringValue;
      }

      // Keep placeholder if key not found
      return match;
    });
  }

  /**
   * Escape HTML special characters
   *
   * @param text - Raw text to escape
   * @returns HTML-escaped text
   */
  escapeHtml(text: string): string {
    const htmlEscapes: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
      "/": "&#x2F;",
    };

    return text.replace(/[&<>"'\/]/g, (char) => htmlEscapes[char] ?? char);
  }

  /**
   * Unescape HTML special characters
   *
   * @param text - HTML-escaped text
   * @returns Raw text
   */
  unescapeHtml(text: string): string {
    const htmlUnescapes: Record<string, string> = {
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&#x27;": "'",
      "&#x2F;": "/",
      "&#39;": "'",
    };

    return text.replace(
      /&(?:amp|lt|gt|quot|#x27|#x2F|#39);/g,
      (entity) => htmlUnescapes[entity] ?? entity,
    );
  }

  /**
   * Check if a string contains placeholders
   *
   * @param text - String to check
   * @returns True if string contains {{placeholders}}
   */
  hasPlaceholders(text: string): boolean {
    return this.placeholderPattern.test(text);
  }

  /**
   * Extract placeholder names from a string
   *
   * @param text - String with placeholders
   * @returns Array of placeholder names
   */
  extractPlaceholders(text: string): string[] {
    const placeholders: string[] = [];
    let match;

    // Reset regex lastIndex
    this.placeholderPattern.lastIndex = 0;

    while ((match = this.placeholderPattern.exec(text)) !== null) {
      placeholders.push(match[1]);
    }

    return [...new Set(placeholders)]; // Remove duplicates
  }
}

// Export singleton instance
export const variableInterpolator = new VariableInterpolator();
