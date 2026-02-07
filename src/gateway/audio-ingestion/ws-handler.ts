/**
 * WebSocket Audio Stream Handler
 *
 * Handles WebSocket-specific audio stream processing.
 * Bridges WebSocket messages to the AudioStreamHandler.
 */

import type { WebSocket } from "ws";
import type { MediaUnderstandingRunner } from "./media-integration.js";
import type {
  AudioStreamMessage,
  AudioStreamStartMessage,
  AudioStreamChunkMessage,
  AudioStreamEndMessage,
  AudioStreamAckMessage,
  AudioStreamErrorMessage,
  AudioTranscriptionMessage,
} from "./types.js";
import { AudioStreamHandler, type StreamHandlerCallbacks } from "./stream-handler.js";

export interface WsAudioHandlerConfig {
  maxConcurrentStreams?: number;
  maxStreamSize?: number;
  maxDuration?: number;
  enableTranscription?: boolean;
  tempStoragePath?: string;
}

export interface WsAudioHandlerCallbacks {
  onStreamStart?: (streamId: string) => void;
  onStreamEnd?: (streamId: string, filePath: string) => void;
  onTranscription?: (streamId: string, text: string) => void;
  onError?: (streamId: string, error: Error) => void;
}

export class WsAudioStreamHandler {
  private ws: WebSocket;
  private nodeId: string;
  private handler: AudioStreamHandler;
  private callbacks: WsAudioHandlerCallbacks;
  private activeStreams = new Set<string>();

  constructor(
    ws: WebSocket,
    nodeId: string,
    config: WsAudioHandlerConfig = {},
    callbacks: WsAudioHandlerCallbacks = {},
    mediaRunner?: MediaUnderstandingRunner,
  ) {
    this.ws = ws;
    this.nodeId = nodeId;
    this.callbacks = callbacks;

    // Create stream handler callbacks
    const streamCallbacks: StreamHandlerCallbacks = {
      onStreamStart: (streamId) => {
        this.activeStreams.add(streamId);
        this.callbacks.onStreamStart?.(streamId);
      },
      onStreamEnd: async (streamId, assembled) => {
        this.activeStreams.delete(streamId);

        // If transcription is enabled and we have a media runner
        if (config.enableTranscription && mediaRunner) {
          try {
            const result = await mediaRunner.transcribe({
              audioData: assembled.data,
              format: assembled.config.format,
              sampleRate: assembled.config.sampleRate,
              channels: assembled.config.channels,
              language: assembled.config.language,
              diarization: assembled.config.diarization,
            });

            // Send transcription result
            this.sendTranscription(streamId, result);
            this.callbacks.onTranscription?.(streamId, result.text);
          } catch (error) {
            this.sendError(
              streamId,
              "STT_PROVIDER_ERROR",
              error instanceof Error ? error.message : "Transcription failed",
              false,
            );
            this.callbacks.onError?.(
              streamId,
              error instanceof Error ? error : new Error(String(error)),
            );
          }
        }

        this.callbacks.onStreamEnd?.(streamId, "completed");
      },
      onStreamError: (streamId, error) => {
        this.activeStreams.delete(streamId);
        this.callbacks.onError?.(streamId, new Error(error.message));
      },
      sendAck: (ack) => {
        this.sendMessage(ack);
      },
      sendError: (error) => {
        this.sendMessage(error);
      },
    };

    this.handler = new AudioStreamHandler(
      {
        maxStreamSize: config.maxStreamSize,
        maxDuration: config.maxDuration,
        tempStoragePath: config.tempStoragePath,
      },
      streamCallbacks,
    );
  }

  /**
   * Handle incoming WebSocket message
   */
  async handleMessage(message: unknown): Promise<void> {
    if (!this.isAudioStreamMessage(message)) {
      return;
    }

    switch (message.type) {
      case "audio.stream.start":
        await this.handler.handleStreamStart(message as AudioStreamStartMessage);
        break;
      case "audio.stream.chunk":
        await this.handler.handleStreamChunk(message as AudioStreamChunkMessage);
        break;
      case "audio.stream.end":
        await this.handler.handleStreamEnd((message as AudioStreamEndMessage).payload.streamId);
        break;
    }
  }

  /**
   * Check if message is an audio stream message
   */
  private isAudioStreamMessage(message: unknown): message is AudioStreamMessage {
    return (
      typeof message === "object" &&
      message !== null &&
      "type" in message &&
      typeof (message as { type?: unknown }).type === "string" &&
      (message as { type: string }).type.startsWith("audio.")
    );
  }

  /**
   * Send message to WebSocket
   */
  private sendMessage(message: AudioStreamMessage): void {
    if (this.ws.readyState === 1) {
      // WebSocket.OPEN
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send transcription result
   */
  private sendTranscription(streamId: string, result: { text: string; confidence?: number }): void {
    const message: AudioTranscriptionMessage = {
      type: "audio.transcription",
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      payload: {
        streamId,
        text: result.text,
        confidence: result.confidence,
        isFinal: true,
      },
    };
    this.sendMessage(message);
  }

  /**
   * Send error message
   */
  private sendError(streamId: string, code: string, message: string, recoverable: boolean): void {
    const errorMessage: AudioStreamErrorMessage = {
      type: "audio.stream.error",
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      payload: {
        streamId,
        code: code as
          | "INVALID_FORMAT"
          | "UNSUPPORTED_SAMPLE_RATE"
          | "STREAM_TIMEOUT"
          | "CHUNK_OUT_OF_ORDER"
          | "AUDIO_TOO_LARGE"
          | "STT_PROVIDER_ERROR"
          | "INTERNAL_ERROR",
        message,
        recoverable,
      },
    };
    this.sendMessage(errorMessage);
  }

  /**
   * Get active stream count
   */
  getActiveStreamCount(): number {
    return this.activeStreams.size;
  }

  /**
   * Check if a stream is active
   */
  isStreamActive(streamId: string): boolean {
    return this.activeStreams.has(streamId);
  }

  /**
   * Dispose of resources
   */
  async dispose(): Promise<void> {
    // Stop all active streams
    for (const streamId of this.activeStreams) {
      await this.handler.handleStreamEnd(streamId);
    }
    this.activeStreams.clear();
  }
}
