/**
 * Speaker Diarization module
 *
 * This module provides speaker diarization functionality for audio transcription,
 * following the C4 architecture documented in docs/c4/planning/.
 *
 * Key features:
 * - Speaker diarization via STT providers (Deepgram, Google Cloud)
 * - Deterministic voiceprint ID generation using SHA-256 hashing
 * - Speaker registry for identity persistence
 * - Structured transcript formatting with speaker labels
 *
 * @example
 * ```typescript
 * import { DiarizationEngine, createDiarizationEngine } from './diarization';
 *
 * const engine = createDiarizationEngine({
 *   enabled: true,
 *   provider: 'deepgram',
 *   speakerCountMin: 1,
 *   speakerCountMax: 6
 * });
 *
 * const result = engine.processResponse(sttResponse);
 * ```
 */

// Core types
export type {
  DiarizationConfig,
  DiarizationResult,
  SpeakerSegment,
  SpeakerMapping,
  SpeakerAlias,
  SpeakerRegistryEntry,
  STTDiarizationResponse,
  VoiceprintId,
  VoiceprintIdConfig,
} from "./types.js";

// Core engine
export { DiarizationEngine, createDiarizationEngine } from "./diarization-engine.js";

// Voiceprint ID generation
export {
  generateVoiceprintId,
  isValidVoiceprintId,
  extractVoiceprintHash,
} from "./voiceprint-id-generator.js";

// Transcript formatting
export {
  formatTranscript,
  formatDiarizationOutput,
  createSimpleTranscript,
} from "./transcript-formatter.js";

// Speaker registry
export { SpeakerRegistry, speakerRegistry } from "./speaker-registry.js";

// Parsers
export {
  parseDeepgramDiarizationResponse,
  buildDeepgramDiarizationQuery,
  parseGoogleDiarizationResponse,
  buildGoogleDiarizationConfig,
} from "./parsers/index.js";
