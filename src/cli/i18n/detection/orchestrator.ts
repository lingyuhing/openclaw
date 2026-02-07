import type { Detector, DetectionResult } from "../types.js";

/**
 * DetectionOrchestrator - Coordinates multiple language detectors
 *
 * Manages a chain of detectors and implements the priority-based
 * detection strategy. Detectors are executed in priority order,
 * and the first successful detection wins.
 *
 * Detection priority (highest to lowest):
 * 1. Command line arguments (--lang, -l) - Priority 1
 * 2. Environment variables (OPENCLAW_LANG, LANG, etc.) - Priority 2
 * 3. Configuration file (~/.config/openclaw/i18n.json) - Priority 3
 * 4. Fallback default (en) - Priority 999
 *
 * @example
 * ```typescript
 * const orchestrator = new DetectionOrchestrator();
 * orchestrator.register(argumentDetector);
 * orchestrator.register(environmentDetector);
 * orchestrator.register(configDetector);
 * orchestrator.register(fallbackDetector);
 *
 * const result = orchestrator.detect();
 * console.log(result.language); // 'zh-CN'
 * console.log(result.source);   // 'argument'
 * ```
 */
export class DetectionOrchestrator {
  private detectors: Detector[] = [];
  private sorted = false;

  /**
   * Register a detector
   */
  register(detector: Detector): this {
    this.detectors.push(detector);
    this.sorted = false;
    return this;
  }

  /**
   * Register multiple detectors
   */
  registerAll(detectors: Detector[]): this {
    this.detectors.push(...detectors);
    this.sorted = false;
    return this;
  }

  /**
   * Remove a detector by name
   */
  unregister(name: string): boolean {
    const index = this.detectors.findIndex((d) => d.name === name);
    if (index >= 0) {
      this.detectors.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all registered detectors
   */
  getDetectors(): Detector[] {
    this.ensureSorted();
    return [...this.detectors];
  }

  /**
   * Get a detector by name
   */
  getDetector(name: string): Detector | undefined {
    return this.detectors.find((d) => d.name === name);
  }

  /**
   * Detect language using all registered detectors
   * Returns the first successful detection (by priority)
   */
  detect(): DetectionResult {
    this.ensureSorted();

    for (const detector of this.detectors) {
      const language = detector.detect();
      if (language) {
        return {
          language,
          source: detector.name,
          priority: detector.priority,
        };
      }
    }

    // This should never happen if fallback detector is registered
    throw new Error("No language detected and no fallback detector available");
  }

  /**
   * Detect language asynchronously
   * Useful when some detectors need async operations
   */
  async detectAsync(): Promise<DetectionResult> {
    this.ensureSorted();

    for (const detector of this.detectors) {
      // Handle both sync and async detect methods
      const language = await Promise.resolve(detector.detect());
      if (language) {
        return {
          language,
          source: detector.name,
          priority: detector.priority,
        };
      }
    }

    throw new Error("No language detected and no fallback detector available");
  }

  /**
   * Clear all detectors
   */
  clear(): void {
    this.detectors = [];
    this.sorted = false;
  }

  /**
   * Check if a detector with the given name is registered
   */
  has(name: string): boolean {
    return this.detectors.some((d) => d.name === name);
  }

  /**
   * Get the number of registered detectors
   */
  count(): number {
    return this.detectors.length;
  }

  /**
   * Ensure detectors are sorted by priority
   */
  private ensureSorted(): void {
    if (!this.sorted) {
      this.detectors.sort((a, b) => a.priority - b.priority);
      this.sorted = true;
    }
  }
}

// Export singleton instance
export const detectionOrchestrator = new DetectionOrchestrator();
