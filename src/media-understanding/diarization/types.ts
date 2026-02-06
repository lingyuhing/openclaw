/**
 * Types for Speaker Diarization feature
 * Following C4 architecture documentation requirements
 */

/**
 * Represents a speaker segment with timing information
 */
export type SpeakerSegment = {
  /** Speaker identifier (0, 1, 2, etc.) from STT provider */
  speakerId: number;
  /** Start time in seconds */
  startTime: number;
  /** End time in seconds */
  endTime: number;
  /** Transcribed text */
  text: string;
  /** Confidence score (0-1) */
  confidence?: number;
};

/**
 * Voiceprint ID generated from speaker features
 * Format: vpr_<32-char-hex-hash>
 */
export type VoiceprintId = `vpr_${string}`;

/**
 * Mapping between STT speaker ID and voiceprint ID
 */
export type SpeakerMapping = {
  /** Original speaker ID from STT provider */
  sttSpeakerId: number;
  /** Generated voiceprint ID */
  voiceprintId: VoiceprintId;
  /** Display label (e.g., "Speaker 0", "Person A") */
  displayLabel: string;
  /** Total speech duration in seconds */
  totalDuration: number;
  /** Number of segments */
  segmentCount: number;
};

/**
 * Diarization configuration options
 */
export type DiarizationConfig = {
  /** Enable speaker diarization */
  enabled: boolean;
  /** STT provider to use for diarization */
  provider: "deepgram" | "google";
  /** Model name for diarization */
  model?: string;
  /** Minimum number of speakers (default: 1) */
  speakerCountMin?: number;
  /** Maximum number of speakers (default: 10) */
  speakerCountMax?: number;
  /** Format for speaker labels (default: "Speaker {id}") */
  speakerLabelFormat?: string;
  /** Enable utterance segmentation */
  utterances?: boolean;
  /** Force voiceprint ID generation for all speakers */
  forceVoiceprintIdForAllSpeakers?: boolean;
};

/**
 * Voiceprint ID generation configuration
 */
export type VoiceprintIdConfig = {
  /** Hash algorithm (default: sha256) */
  algorithm: "sha256";
  /** Vector normalization method (default: l2) */
  vectorNormalization: "l2";
  /** Output format template (default: "vpr_{hash}") */
  outputFormat: string;
  /** Hash truncation length in characters (default: 32) */
  hashTruncation: number;
};

/**
 * Result of diarization processing
 */
export type DiarizationResult = {
  /** Whether diarization was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Array of speaker segments with timing */
  segments: SpeakerSegment[];
  /** Mapping of speakers to voiceprint IDs */
  speakerMappings: SpeakerMapping[];
  /** Total number of speakers detected */
  speakerCount: number;
  /** Full transcript text */
  fullTranscript: string;
  /** Formatted output with speaker labels */
  formattedOutput: string;
};

/**
 * Raw response from STT provider with diarization
 */
export type STTDiarizationResponse = {
  /** Provider name */
  provider: string;
  /** Model used */
  model: string;
  /** Raw response data */
  raw: unknown;
  /** Extracted segments */
  segments: SpeakerSegment[];
};

/**
 * Speaker alias mapping for persistence
 */
export type SpeakerAlias = {
  /** Voiceprint ID */
  voiceprintId: VoiceprintId;
  /** User-defined alias */
  alias: string;
  /** When the alias was created */
  createdAt: number;
  /** When the alias was last used */
  lastUsedAt: number;
  /** Number of times this alias has been used */
  useCount: number;
};

/**
 * Speaker registry entry for persistence
 */
export type SpeakerRegistryEntry = {
  /** Voiceprint ID */
  voiceprintId: VoiceprintId;
  /** First detected timestamp */
  firstDetectedAt: number;
  /** Last detected timestamp */
  lastDetectedAt: number;
  /** Total number of occurrences */
  occurrenceCount: number;
  /** Total speech duration in seconds */
  totalDuration: number;
  /** Optional alias */
  alias?: string;
  /** Features hash for verification */
  featuresHash: string;
};
