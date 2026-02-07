/**
 * Audio Stream Handler
 *
 * Handles WebSocket audio stream messages from Android nodes.
 * Manages stream lifecycle: start -> chunks -> end -> transcription
 */

import { randomUUID } from "node:crypto";
import type { MediaUnderstandingConfig } from "../../media-understanding/types.js";
import type {
  AudioStreamStartMessage,
  AudioStreamChunkMessage,
  AudioStreamEndMessage,
  AudioStreamState,
  AudioStreamConfig,
  AudioStreamChunk,
  AudioStreamError,
  AudioStreamAckMessage,
  AudioStreamErrorMessage,
  AssembledAudio,
} from "./types.js";
import { AudioAssembler } from "./assembler.js";
import { StreamMonitor } from "./monitor.js";
import { AudioStorage } from "./storage.js";
import { AudioValidator } from "./validator.js";

export interface StreamHandlerConfig {
  maxStreamSize?: number; // bytes, default 100MB
  maxDuration?: number; // ms, default 5 minutes
  chunkTimeout?: number; // ms, default 10 seconds
  assemblyTimeout?: number; // ms, default 30 seconds
  supportedFormats?: string[]; // default ["opus", "pcm", "wav", "aac"]
  tempStoragePath?: string;
}

export interface StreamHandlerCallbacks {
  onStreamStart?: (streamId: string, config: AudioStreamConfig) => void;
  onStreamChunk?: (streamId: string, chunk: AudioStreamChunk) => void;
  onStreamEnd?: (streamId: string, assembled: AssembledAudio) => Promise<void>;
  onStreamError?: (streamId: string, error: AudioStreamError) => void;
  onTranscriptionStart?: (streamId: string) => void;
  onTranscriptionComplete?: (streamId: string, result: unknown) => void;
  sendAck?: (ack: AudioStreamAckMessage) => void;
  sendError?: (error: AudioStreamErrorMessage) => void;
}

export class AudioStreamHandler {
  private streams = new Map<string, AudioStreamState>();
  private assemblers = new Map<string, AudioAssembler>();
  private config: Required<StreamHandlerConfig>;
  private validator: AudioValidator;
  private storage: AudioStorage;
  private monitor: StreamMonitor;
  private callbacks: StreamHandlerCallbacks;

  constructor(config: StreamHandlerConfig = {}, callbacks: StreamHandlerCallbacks = {}) {
    this.config = {
      maxStreamSize: config.maxStreamSize ?? 100 * 1024 * 1024, // 100MB
      maxDuration: config.maxDuration ?? 5 * 60 * 1000, // 5 minutes
      chunkTimeout: config.chunkTimeout ?? 10000, // 10 seconds
      assemblyTimeout: config.assemblyTimeout ?? 30000, // 30 seconds
      supportedFormats: config.supportedFormats ?? ["opus", "pcm", "wav", "aac"],
      tempStoragePath: config.tempStoragePath ?? "/tmp/openclaw-audio",
    };
    this.callbacks = callbacks;
    this.validator = new AudioValidator();
    this.storage = new AudioStorage(this.config.tempStoragePath);
    this.monitor = new StreamMonitor();
  }

  /**
   * Handle audio stream start message
   */
  async handleStreamStart(message: AudioStreamStartMessage): Promise<void> {
    const { payload } = message;
    const streamId = randomUUID();

    // Validate format
    if (!this.config.supportedFormats.includes(payload.format)) {
      this.sendError({
        type: "audio.stream.error",
        id: randomUUID(),
        timestamp: Date.now(),
        payload: {
          streamId,
          code: "INVALID_FORMAT",
          message: `Unsupported audio format: ${payload.format}. Supported: ${this.config.supportedFormats.join(", ")}`,
          recoverable: false,
        },
      });
      return;
    }

    // Create stream state
    const state: AudioStreamState = {
      streamId,
      config: payload,
      status: "receiving",
      receivedChunks: 0,
      totalBytes: 0,
      startedAt: Date.now(),
    };

    this.streams.set(streamId, state);

    // Create assembler for this stream
    const assembler = new AudioAssembler(streamId, payload);
    this.assemblers.set(streamId, assembler);

    // Start monitoring
    this.monitor.startStream(streamId, this.config.chunkTimeout);

    // Send acknowledgment
    this.sendAck({
      type: "audio.stream.ack",
      id: randomUUID(),
      timestamp: Date.now(),
      payload: {
        streamId,
        receivedChunks: 0,
        status: "receiving",
        progress: 0,
      },
    });

    // Notify callback
    this.callbacks.onStreamStart?.(streamId, payload);
  }

  /**
   * Handle audio stream chunk message
   */
  async handleStreamChunk(message: AudioStreamChunkMessage): Promise<void> {
    const { payload } = message;
    const { streamId, sequence, data, isLast } = payload;

    // Get stream state
    const state = this.streams.get(streamId);
    if (!state) {
      this.sendError({
        type: "audio.stream.error",
        id: randomUUID(),
        timestamp: Date.now(),
        payload: {
          streamId,
          code: "INTERNAL_ERROR",
          message: "Stream not found",
          recoverable: false,
        },
      });
      return;
    }

    // Check stream size limit
    if (state.totalBytes > this.config.maxStreamSize) {
      state.status = "error";
      state.error = {
        code: "AUDIO_TOO_LARGE",
        message: `Stream exceeds maximum size of ${this.config.maxStreamSize} bytes`,
        recoverable: false,
      };
      this.sendError({
        type: "audio.stream.error",
        id: randomUUID(),
        timestamp: Date.now(),
        payload: {
          streamId,
          code: "AUDIO_TOO_LARGE",
          message: `Stream exceeds maximum size of ${this.config.maxStreamSize} bytes`,
          recoverable: false,
        },
      });
      this.cleanupStream(streamId);
      return;
    }

    // Decode base64 data
    let chunkData: Buffer;
    try {
      chunkData = Buffer.from(data, "base64");
    } catch (err) {
      this.sendError({
        type: "audio.stream.error",
        id: randomUUID(),
        timestamp: Date.now(),
        payload: {
          streamId,
          code: "INTERNAL_ERROR",
          message: `Failed to decode chunk data: ${err instanceof Error ? err.message : String(err)}`,
          recoverable: true,
        },
      });
      return;
    }

    // Update stream state
    state.receivedChunks++;
    state.totalBytes += chunkData.length;
    state.lastChunkAt = Date.now();

    // Add chunk to assembler
    const assembler = this.assemblers.get(streamId);
    if (assembler) {
      assembler.addChunk({
        streamId,
        sequence,
        data: chunkData,
        isLast,
        timestamp: Date.now(),
      });
    }

    // Update monitor
    this.monitor.updateStream(streamId);

    // Send acknowledgment
    this.sendAck({
      type: "audio.stream.ack",
      id: randomUUID(),
      timestamp: Date.now(),
      payload: {
        streamId,
        receivedChunks: state.receivedChunks,
        status: isLast ? "processing" : "receiving",
        progress: isLast
          ? 100
          : Math.min(99, Math.floor((state.receivedChunks / (state.receivedChunks + 1)) * 100)),
      },
    });

    // Notify callback
    this.callbacks.onStreamChunk?.(streamId, {
      streamId,
      sequence,
      data: chunkData,
      isLast,
      timestamp: Date.now(),
    });

    // Handle stream end if this is the last chunk
    if (isLast) {
      state.status = "processing";
      await this.finalizeStream(streamId);
    }
  }

  /**
   * Handle audio stream end message
   */
  async handleStreamEnd(streamId: string): Promise<void> {
    const state = this.streams.get(streamId);
    if (!state) {
      return;
    }

    state.status = "processing";
    await this.finalizeStream(streamId);
  }

  /**
   * Finalize a stream and process the assembled audio
   */
  private async finalizeStream(streamId: string): Promise<void> {
    const state = this.streams.get(streamId);
    if (!state) {
      return;
    }

    try {
      // Get assembled audio
      const assembler = this.assemblers.get(streamId);
      if (!assembler) {
        throw new Error("Assembler not found");
      }

      const assembled = assembler.getAssembly();
      if (!assembled) {
        throw new Error("No audio data assembled");
      }

      // Validate audio
      const validation = await this.validator.validate(assembled);
      if (!validation.valid) {
        state.status = "error";
        state.error = {
          code: "INVALID_FORMAT",
          message: `Audio validation failed: ${validation.errors.join(", ")}`,
          recoverable: false,
        };
        this.callbacks.onStreamError?.(streamId, state.error);
        this.cleanupStream(streamId);
        return;
      }

      // Store audio temporarily
      const storedPath = await this.storage.save(assembled);

      // Update state
      state.status = "completed";
      state.completedAt = Date.now();

      // Notify callback
      await this.callbacks.onStreamEnd?.(streamId, assembled);

      // Cleanup
      this.cleanupStream(streamId);
    } catch (error) {
      state.status = "error";
      state.error = {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : String(error),
        recoverable: false,
      };
      this.callbacks.onStreamError?.(streamId, state.error);
      this.cleanupStream(streamId);
    }
  }

  /**
   * Clean up stream resources
   */
  private cleanupStream(streamId: string): void {
    this.streams.delete(streamId);
    this.assemblers.delete(streamId);
    this.monitor.stopStream(streamId);
  }

  /**
   * Get stream state
   */
  getStreamState(streamId: string): AudioStreamState | undefined {
    return this.streams.get(streamId);
  }

  /**
   * Get all active streams
   */
  getActiveStreams(): AudioStreamState[] {
    return Array.from(this.streams.values());
  }

  /**
   * Check if a stream exists
   */
  hasStream(streamId: string): boolean {
    return this.streams.has(streamId);
  }

  /**
   * Send acknowledgment message
   */
  private sendAck(ack: AudioStreamAckMessage): void {
    this.callbacks.sendAck?.(ack);
  }

  /**
   * Send error message
   */
  private sendError(error: AudioStreamErrorMessage): void {
    this.callbacks.sendError?.(error);
  }
}
