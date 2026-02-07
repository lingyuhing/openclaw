/**
 * Audio Ingestion Types
 *
 * Types for the gateway audio ingestion system.
 */

export type AudioFormat = "opus" | "pcm" | "wav" | "aac";

export type AudioStreamStatus = "receiving" | "processing" | "completed" | "error";

export interface AudioStreamConfig {
  sessionKey: string;
  format: AudioFormat;
  sampleRate: number;
  channels: number;
  bitDepth?: number;
  language?: string;
  diarization?: boolean;
  maxSpeakers?: number;
  keywords?: string[];
}

export interface AudioStreamChunk {
  streamId: string;
  sequence: number;
  data: Buffer;
  isLast: boolean;
  timestamp?: number;
}

export interface AudioStreamState {
  streamId: string;
  config: AudioStreamConfig;
  status: AudioStreamStatus;
  receivedChunks: number;
  totalBytes: number;
  startedAt: number;
  lastChunkAt?: number;
  completedAt?: number;
  error?: AudioStreamError;
}

export interface AudioStreamError {
  code: AudioStreamErrorCode;
  message: string;
  recoverable: boolean;
}

export type AudioStreamErrorCode =
  | "INVALID_FORMAT"
  | "UNSUPPORTED_SAMPLE_RATE"
  | "STREAM_TIMEOUT"
  | "CHUNK_OUT_OF_ORDER"
  | "AUDIO_TOO_LARGE"
  | "STT_PROVIDER_ERROR"
  | "INTERNAL_ERROR";

export interface AssembledAudio {
  streamId: string;
  config: AudioStreamConfig;
  data: Buffer;
  totalChunks: number;
  totalBytes: number;
  duration?: number;
  assembledAt: number;
}

export interface AudioValidationResult {
  valid: boolean;
  format?: AudioFormat;
  sampleRate?: number;
  channels?: number;
  duration?: number;
  errors: string[];
}

export interface TranscriptionResult {
  streamId: string;
  text: string;
  confidence?: number;
  language?: string;
  duration?: number;
  isFinal: boolean;
  speakers?: Array<{
    id: string;
    label?: string;
    startTime: number;
    endTime: number;
    confidence?: number;
  }>;
  alternatives?: string[];
  metadata?: {
    provider: string;
    model: string;
    processingTime: number;
  };
}

// WebSocket Message Types

export interface AudioStreamStartMessage {
  type: "audio.stream.start";
  id: string;
  timestamp: number;
  payload: {
    sessionKey: string;
    format: AudioFormat;
    sampleRate: number;
    channels: number;
    bitDepth?: number;
    language?: string;
    diarization?: boolean;
    maxSpeakers?: number;
    keywords?: string[];
  };
}

export interface AudioStreamChunkMessage {
  type: "audio.stream.chunk";
  id: string;
  timestamp: number;
  payload: {
    streamId: string;
    sequence: number;
    data: string; // Base64 encoded
    isLast: boolean;
    timestamp?: number;
  };
}

export interface AudioStreamEndMessage {
  type: "audio.stream.end";
  id: string;
  timestamp: number;
  payload: {
    streamId: string;
    totalChunks: number;
    totalBytes: number;
    duration?: number;
  };
}

export interface AudioStreamAckMessage {
  type: "audio.stream.ack";
  id: string;
  timestamp: number;
  payload: {
    streamId: string;
    receivedChunks: number;
    status: AudioStreamStatus;
    progress?: number;
  };
}

export interface AudioStreamErrorMessage {
  type: "audio.stream.error";
  id: string;
  timestamp: number;
  payload: {
    streamId: string;
    code: AudioStreamErrorCode;
    message: string;
    recoverable: boolean;
  };
}

export interface AudioTranscriptionMessage {
  type: "audio.transcription";
  id: string;
  timestamp: number;
  payload: {
    streamId: string;
    text: string;
    confidence?: number;
    language?: string;
    duration?: number;
    isFinal: boolean;
    speakers?: Array<{
      id: string;
      label?: string;
      startTime: number;
      endTime: number;
      confidence?: number;
    }>;
    alternatives?: string[];
    metadata?: {
      provider: string;
      model: string;
      processingTime: number;
    };
  };
}

export type AudioStreamMessage =
  | AudioStreamStartMessage
  | AudioStreamChunkMessage
  | AudioStreamEndMessage
  | AudioStreamAckMessage
  | AudioStreamErrorMessage
  | AudioTranscriptionMessage;
