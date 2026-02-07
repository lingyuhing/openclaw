import type { ArgumentDetector, LanguageCode } from "../types.js";

/**
 * ArgumentDetector - Detects language from command line arguments
 *
 * Detects --lang or -l parameters from process.argv
 *
 * @example
 * --lang zh-CN
 * -l en
 * --lang=zh-CN
 */
export class CliArgumentDetector implements ArgumentDetector {
  readonly name = "argument";
  readonly priority = 1;

  private readonly argNames = ["--lang", "-l"];

  detect(): LanguageCode | null {
    return this.parseArgs(process.argv);
  }

  parseArgs(args: string[]): LanguageCode | null {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      // Check for --lang=value format
      for (const argName of this.argNames) {
        if (arg.startsWith(`${argName}=`)) {
          const value = arg.slice(argName.length + 1);
          if (value) {
            return this.normalizeLanguageCode(value);
          }
        }
      }

      // Check for --lang value format
      if (this.argNames.includes(arg)) {
        const nextArg = args[i + 1];
        if (nextArg && !nextArg.startsWith("-")) {
          return this.normalizeLanguageCode(nextArg);
        }
      }
    }

    return null;
  }

  private normalizeLanguageCode(code: string): LanguageCode {
    // Normalize code like zh_CN to zh-CN
    return code.replace("_", "-").toLowerCase();
  }
}

// Export singleton instance
export const argumentDetector = new CliArgumentDetector();
