import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve, dirname } from "node:path";
import type { ConfigService, UserI18nConfig, LanguageCode } from "../types.js";

/**
 * FileConfigService - Manages i18n configuration persistence
 *
 * This service handles reading and writing user i18n configuration
 * to a JSON file (default: ~/.config/openclaw/i18n.json)
 */
export class FileConfigService implements ConfigService {
  private configPath: string;
  private cachedConfig: UserI18nConfig | null = null;
  private cacheValid = false;

  constructor(configPath?: string) {
    this.configPath = configPath ?? this.getDefaultConfigPath();
  }

  /**
   * Get the default configuration file path
   */
  private getDefaultConfigPath(): string {
    return resolve(homedir(), ".config", "openclaw", "i18n.json");
  }

  /**
   * Load configuration from file
   */
  async loadConfig(): Promise<UserI18nConfig> {
    // Return cached config if valid
    if (this.cacheValid && this.cachedConfig) {
      return this.cachedConfig;
    }

    try {
      if (!existsSync(this.configPath)) {
        // Return default config if file doesn't exist
        const defaultConfig: UserI18nConfig = {};
        this.cachedConfig = defaultConfig;
        this.cacheValid = true;
        return defaultConfig;
      }

      const content = await readFile(this.configPath, "utf-8");
      const config = JSON.parse(content) as UserI18nConfig;

      if (!this.validateConfig(config)) {
        throw new Error("Invalid configuration format");
      }

      this.cachedConfig = config;
      this.cacheValid = true;
      return config;
    } catch (error) {
      // Return empty config on error
      const emptyConfig: UserI18nConfig = {};
      this.cachedConfig = emptyConfig;
      this.cacheValid = true;
      return emptyConfig;
    }
  }

  /**
   * Save configuration to file
   */
  async saveConfig(config: UserI18nConfig): Promise<void> {
    // Ensure directory exists
    const dir = dirname(this.configPath);
    await mkdir(dir, { recursive: true });

    // Write config file
    await writeFile(this.configPath, JSON.stringify(config, null, 2), "utf-8");

    // Update cache
    this.cachedConfig = config;
    this.cacheValid = true;
  }

  /**
   * Get current configuration (from cache)
   */
  getConfig(): UserI18nConfig {
    if (this.cacheValid && this.cachedConfig) {
      return this.cachedConfig;
    }
    // Return empty config if not loaded
    return {};
  }

  /**
   * Validate configuration object
   */
  validateConfig(config: unknown): config is UserI18nConfig {
    if (typeof config !== "object" || config === null) {
      return false;
    }

    const c = config as Record<string, unknown>;

    // Validate optional fields
    if (c.language !== undefined && typeof c.language !== "string") {
      return false;
    }
    if (c.fallbackLanguage !== undefined && typeof c.fallbackLanguage !== "string") {
      return false;
    }
    if (c.dateFormat !== undefined && typeof c.dateFormat !== "string") {
      return false;
    }
    if (c.numberFormat !== undefined && typeof c.numberFormat !== "string") {
      return false;
    }

    return true;
  }

  /**
   * Invalidate the cache
   */
  invalidateCache(): void {
    this.cacheValid = false;
    this.cachedConfig = null;
  }

  /**
   * Get the configuration file path
   */
  getConfigPath(): string {
    return this.configPath;
  }
}

// Export singleton instance
export const fileConfigService = new FileConfigService();
