/**
 * Audio Ingestion Module
 *
 * Main entry point for the gateway audio ingestion system.
 */

// Core components
export { AudioStreamHandler } from "./stream-handler.js";
export { AudioAssembler } from "./assembler.js";
export { AudioValidator } from "./validator.js";
export { AudioStorage } from "./storage.js";
export { StreamMonitor } from "./monitor.js";

// WebSocket integration
export { WsAudioStreamHandler } from "./ws-handler.js";

// Media Understanding integration
export {
  MediaUnderstandingRunner,
  type TranscriptionOptions,
  type TranscriptionResult,
} from "./media-integration.js";

// Gateway integration
export {
  GatewayAudioIngestion,
  type AudioIngestionGatewayConfig,
  type AudioIngestionGatewayContext,
} from "./gateway-integration.js";

// Types
export type {
  AudioFormat,
  AudioStreamStatus,
  AudioStreamConfig,
  AudioStreamChunk,
  AudioStreamState,
  AudioStreamError,
  AudioStreamErrorCode,
  AssembledAudio,
  AudioValidationResult,
  TranscriptionResult,
  SpeakerInfo,
  AudioStreamMessage,
  AudioStreamStartMessage,
  AudioStreamChunkMessage,
  AudioStreamEndMessage,
  AudioStreamAckMessage,
  AudioStreamErrorMessage,
  AudioTranscriptionMessage,
} from "./types.js";

// Configuration types
export type { StreamHandlerConfig, StreamHandlerCallbacks } from "./stream-handler.js";

export type { WsAudioHandlerConfig, WsAudioHandlerCallbacks } from "./ws-handler.js";
