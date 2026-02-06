export type MediaUnderstandingKind =
  | "audio.transcription"
  | "video.description"
  | "image.description";

export type MediaUnderstandingCapability = "image" | "audio" | "video";

export type MediaAttachment = {
  path?: string;
  url?: string;
  mime?: string;
  index: number;
};

/**
 * Speaker diarization segment information
 */
export type DiarizationSegment = {
  /** Speaker identifier (0, 1, 2, etc.) */
  speakerId: number;
  /** Start time in seconds */
  startTime: number;
  /** End time in seconds */
  endTime: number;
  /** Transcribed text for this segment */
  text: string;
  /** Confidence score (0-1) */
  confidence?: number;
};

/**
 * Speaker diarization information attached to transcription results
 */
export type DiarizationInfo = {
  /** Array of speaker segments with timing */
  segments: DiarizationSegment[];
  /** Total number of unique speakers detected */
  speakerCount: number;
  /** Formatted output with speaker labels */
  formattedOutput: string;
};

export type MediaUnderstandingOutput = {
  kind: MediaUnderstandingKind;
  attachmentIndex: number;
  text: string;
  provider: string;
  model?: string;
  /** Optional diarization information for audio transcriptions */
  diarization?: DiarizationInfo;
};

export type MediaUnderstandingDecisionOutcome =
  | "success"
  | "skipped"
  | "disabled"
  | "no-attachment"
  | "scope-deny";

export type MediaUnderstandingModelDecision = {
  provider?: string;
  model?: string;
  type: "provider" | "cli";
  outcome: "success" | "skipped" | "failed";
  reason?: string;
};

export type MediaUnderstandingAttachmentDecision = {
  attachmentIndex: number;
  attempts: MediaUnderstandingModelDecision[];
  chosen?: MediaUnderstandingModelDecision;
};

export type MediaUnderstandingDecision = {
  capability: MediaUnderstandingCapability;
  outcome: MediaUnderstandingDecisionOutcome;
  attachments: MediaUnderstandingAttachmentDecision[];
};

export type AudioTranscriptionRequest = {
  buffer: Buffer;
  fileName: string;
  mime?: string;
  apiKey: string;
  baseUrl?: string;
  headers?: Record<string, string>;
  model?: string;
  language?: string;
  prompt?: string;
  query?: Record<string, string | number | boolean>;
  timeoutMs: number;
  fetchFn?: typeof fetch;
  /** Optional diarization configuration */
  diarization?: {
    enabled: boolean;
    speakerCountMin?: number;
    speakerCountMax?: number;
  };
};

export type AudioTranscriptionResult = {
  text: string;
  model?: string;
  /** Optional diarization information when diarization is enabled */
  diarization?: DiarizationInfo;
};

export type VideoDescriptionRequest = {
  buffer: Buffer;
  fileName: string;
  mime?: string;
  apiKey: string;
  baseUrl?: string;
  headers?: Record<string, string>;
  model?: string;
  prompt?: string;
  timeoutMs: number;
  fetchFn?: typeof fetch;
};

export type VideoDescriptionResult = {
  text: string;
  model?: string;
};

export type ImageDescriptionRequest = {
  buffer: Buffer;
  fileName: string;
  mime?: string;
  model: string;
  provider: string;
  prompt?: string;
  maxTokens?: number;
  timeoutMs: number;
  profile?: string;
  preferredProfile?: string;
  agentDir: string;
  cfg: import("../config/config.js").OpenClawConfig;
};

export type ImageDescriptionResult = {
  text: string;
  model?: string;
};

export type MediaUnderstandingProvider = {
  id: string;
  capabilities?: MediaUnderstandingCapability[];
  transcribeAudio?: (req: AudioTranscriptionRequest) => Promise<AudioTranscriptionResult>;
  describeVideo?: (req: VideoDescriptionRequest) => Promise<VideoDescriptionResult>;
  describeImage?: (req: ImageDescriptionRequest) => Promise<ImageDescriptionResult>;
};
