import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import type { ConfigDetector, LanguageCode, UserI18nConfig } from "../types.js";

/**
 * ConfigDetector - Detects language from user configuration file
 *
 * Reads language preference from the OpenClaw configuration file.
 * Default path: ~/.config/openclaw/i18n.json
 *
 * Configuration file format:
 * ```json
 * {
 *   "language": "zh-CN",
 *   "fallbackLanguage": "en",
 *   "dateFormat": "zh-CN",
 *   "numberFormat": "zh-CN"
 * }
 * ```
 */
export class CliConfigDetector implements ConfigDetector {
  readonly name = "config";
  readonly priority = 3;
  readonly configPath: string;

  private cachedConfig: UserI18nConfig | null = null;
  private configReadTime = 0;
  private readonly cacheTtl = 5000; // 5 seconds cache

  constructor(configPath?: string) {
    this.configPath = configPath ?? this.getDefaultConfigPath();
  }

  /**
   * Get the default configuration file path
   */
  private getDefaultConfigPath(): string {
    return resolve(homedir(), ".config", "openclaw", "i18n.json");
  }

  detect(): LanguageCode | null {
    const config = this.readConfigSync();
    if (config?.language) {
      return this.normalizeLanguageCode(config.language);
    }
    return null;
  }

  async detectAsync(): Promise<LanguageCode | null> {
    const config = await this.readConfig();
    if (config?.language) {
      return this.normalizeLanguageCode(config.language);
    }
    return null;
  }

  /**
   * Read configuration synchronously (with cache)
   */
  readConfigSync(): UserI18nConfig | null {
    const now = Date.now();
    if (this.cachedConfig && now - this.configReadTime < this.cacheTtl) {
      return this.cachedConfig;
    }

    try {
      if (!existsSync(this.configPath)) {
        return null;
      }

      // Use readFileSync equivalent for ESM compatibility
      const content = this.readFileSync(this.configPath);
      if (!content) {
        return null;
      }

      const config = JSON.parse(content) as UserI18nConfig;
      this.cachedConfig = config;
      this.configReadTime = now;
      return config;
    } catch {
      // If file is corrupted or unreadable, return null
      return null;
    }
  }

  /**
   * Read configuration asynchronously (with cache)
   */
  async readConfig(): Promise<UserI18nConfig | null> {
    const now = Date.now();
    if (this.cachedConfig && now - this.configReadTime < this.cacheTtl) {
      return this.cachedConfig;
    }

    try {
      if (!existsSync(this.configPath)) {
        return null;
      }

      const content = await readFile(this.configPath, "utf-8");
      const config = JSON.parse(content) as UserI18nConfig;
      this.cachedConfig = config;
      this.configReadTime = now;
      return config;
    } catch {
      return null;
    }
  }

  /**
   * Save configuration to file
   */
  async saveConfig(config: UserI18nConfig): Promise<void> {
    const { mkdir, writeFile } = await import("node:fs/promises");
    const { dirname } = await import("node:path");

    // Ensure directory exists
    await mkdir(dirname(this.configPath), { recursive: true });

    // Write configuration
    await writeFile(this.configPath, JSON.stringify(config, null, 2), "utf-8");

    // Update cache
    this.cachedConfig = config;
    this.configReadTime = Date.now();
  }

  private readFileSync(path: string): string | null {
    try {
      // For ESM compatibility, we use a simple synchronous read
      // In a real implementation, you might want to use fs.readFileSync
      const { readFileSync: fsReadFileSync } = require("node:fs");
      return fsReadFileSync(path, "utf-8");
    } catch {
      return null;
    }
  }

  private normalizeLanguageCode(code: string): LanguageCode {
    return code.replace("_", "-").toLowerCase();
  }
}

// Export singleton instance with default path
export const configDetector = new CliConfigDetector();
