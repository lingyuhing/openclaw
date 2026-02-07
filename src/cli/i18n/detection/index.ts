import type { Detector, DetectionResult, LanguageCode } from "../types.js";
import { DetectionOrchestrator } from "./orchestrator.js";

// Re-export detection components
export { CliArgumentDetector, argumentDetector } from "./argument-detector.js";
export { CliEnvironmentDetector, environmentDetector } from "./environment-detector.js";
export { CliConfigDetector, configDetector } from "./config-detector.js";
export { DefaultFallbackDetector, fallbackDetector } from "./fallback-detector.js";
export { DetectionOrchestrator, detectionOrchestrator } from "./orchestrator.js";

/**
 * Create a fully configured detection orchestrator
 *
 * This factory function creates an orchestrator with all standard
 * detectors registered in the correct priority order.
 *
 * @param configPath - Optional custom config file path
 * @returns Configured DetectionOrchestrator instance
 *
 * @example
 * ```typescript
 * const orchestrator = createDetectionOrchestrator();
 * const result = orchestrator.detect();
 * console.log(`Detected language: ${result.language}`);
 * ```
 */
export function createDetectionOrchestrator(configPath?: string): DetectionOrchestrator {
  const orchestrator = new DetectionOrchestrator();

  // Import detectors dynamically to avoid circular dependencies
  const { CliArgumentDetector } = require("./argument-detector.js");
  const { CliEnvironmentDetector } = require("./environment-detector.js");
  const { CliConfigDetector } = require("./config-detector.js");
  const { DefaultFallbackDetector } = require("./fallback-detector.js");

  // Register detectors in priority order
  orchestrator.register(new CliArgumentDetector());
  orchestrator.register(new CliEnvironmentDetector());
  orchestrator.register(new CliConfigDetector(configPath));
  orchestrator.register(new DefaultFallbackDetector("en"));

  return orchestrator;
}

/**
 * Quick detect function - creates a temporary orchestrator and detects language
 *
 * This is a convenience function for simple use cases where you just need
 * to detect the language without managing the orchestrator lifecycle.
 *
 * @param configPath - Optional custom config file path
 * @returns DetectionResult with language and source
 *
 * @example
 * ```typescript
 * const result = quickDetect();
 * console.log(`Language: ${result.language} (from ${result.source})`);
 * ```
 */
export function quickDetect(configPath?: string): DetectionResult {
  const orchestrator = createDetectionOrchestrator(configPath);
  return orchestrator.detect();
}

/**
 * Async quick detect function
 *
 * Same as quickDetect but returns a Promise for async compatibility.
 *
 * @param configPath - Optional custom config file path
 * @returns Promise<DetectionResult>
 */
export async function quickDetectAsync(configPath?: string): Promise<DetectionResult> {
  const orchestrator = createDetectionOrchestrator(configPath);
  return orchestrator.detectAsync();
}

// Type re-exports for convenience
export type { Detector, DetectionResult, LanguageCode };
