import type { EnvironmentDetector, LanguageCode } from "../types.js";

/**
 * EnvironmentDetector - Detects language from environment variables
 *
 * Reads language from environment variables in priority order:
 * 1. OPENCLAW_LANG - Application-specific
 * 2. LANG - Standard Unix locale
 * 3. LC_ALL - Standard Unix locale override
 * 4. LC_MESSAGES - Standard Unix messages locale
 *
 * @example
 * OPENCLAW_LANG=zh-CN
 * LANG=zh_CN.UTF-8
 * LC_ALL=en_US.UTF-8
 */
export class CliEnvironmentDetector implements EnvironmentDetector {
  readonly name = "environment";
  readonly priority = 2;

  // Environment variables to check in order of priority
  readonly envVars = ["OPENCLAW_LANG", "LANG", "LC_ALL", "LC_MESSAGES"];

  detect(): LanguageCode | null {
    return this.readEnv();
  }

  readEnv(): LanguageCode | null {
    for (const envVar of this.envVars) {
      const value = process.env[envVar];
      if (value) {
        const normalized = this.normalizeLanguageCode(value);
        if (normalized) {
          return normalized;
        }
      }
    }

    return null;
  }

  /**
   * Normalize language code from environment variable
   *
   * Handles formats like:
   * - zh-CN (already normalized)
   * - zh_CN.UTF-8 (Unix locale format)
   * - en_US (underscore format)
   * - C (Posix default, returns null)
   * - C.UTF-8 (Posix with encoding, returns null)
   */
  private normalizeLanguageCode(value: string): LanguageCode | null {
    // Remove encoding suffix (.UTF-8, .GB2312, etc.)
    let code = value.split(".")[0] ?? value;

    // Handle Posix "C" locale (means default/undefined)
    if (code === "C" || code === "POSIX") {
      return null;
    }

    // Replace underscores with hyphens
    code = code.replace(/_/g, "-");

    // Lowercase the code
    code = code.toLowerCase();

    // Validate format (should be like "zh-cn" or "en")
    if (!/^[a-z]{2,3}(-[a-z]{2,4})?$/.test(code)) {
      return null;
    }

    return code;
  }
}

// Export singleton instance
export const environmentDetector = new CliEnvironmentDetector();
