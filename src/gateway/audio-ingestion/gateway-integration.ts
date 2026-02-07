/**
 * Gateway Integration
 *
 * Integrates the audio ingestion system with the Gateway WebSocket handler.
 * This module connects audio stream messages from Android nodes to the
 * audio ingestion pipeline.
 */

import type { IncomingMessage } from "node:http";
import type { WebSocket } from "ws";
import type { OpenClawConfig } from "../../config/types.js";
import type { createSubsystemLogger } from "../../logging/subsystem.js";
import { MediaUnderstandingRunner } from "./media-integration.js";
import { WsAudioStreamHandler, type WsAudioHandlerCallbacks } from "./ws-handler.js";

export interface AudioIngestionGatewayConfig {
  enabled?: boolean;
  maxConcurrentStreams?: number;
  maxStreamSize?: number;
  maxDuration?: number;
  tempStoragePath?: string;
  enableTranscription?: boolean;
}

export interface AudioIngestionGatewayContext {
  ws: WebSocket;
  upgradeReq: IncomingMessage;
  connId: string;
  nodeId: string;
  config: OpenClawConfig;
  log: ReturnType<typeof createSubsystemLogger>;
}

export class GatewayAudioIngestion {
  private handlers = new Map<string, WsAudioStreamHandler>();
  private config: Required<AudioIngestionGatewayConfig>;
  private mediaRunner?: MediaUnderstandingRunner;
  private globalConfig: OpenClawConfig;
  private log: ReturnType<typeof createSubsystemLogger>;

  constructor(config: OpenClawConfig, log: ReturnType<typeof createSubsystemLogger>) {
    this.globalConfig = config;
    this.log = log;

    const ingestionConfig = config.gateway?.audioIngestion ?? {};
    this.config = {
      enabled: ingestionConfig.enabled ?? true,
      maxConcurrentStreams: ingestionConfig.maxConcurrentStreams ?? 10,
      maxStreamSize: ingestionConfig.maxStreamSize ?? 100 * 1024 * 1024,
      maxDuration: ingestionConfig.maxDuration ?? 5 * 60 * 1000,
      tempStoragePath: ingestionConfig.tempStoragePath ?? "/tmp/openclaw-audio",
      enableTranscription: ingestionConfig.enableTranscription ?? true,
    };

    // Initialize Media Understanding runner if transcription is enabled
    if (this.config.enableTranscription) {
      try {
        this.mediaRunner = new MediaUnderstandingRunner(config);
        this.log.info("Media Understanding runner initialized for audio ingestion");
      } catch (error) {
        this.log.error(
          `Failed to initialize Media Understanding runner: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  /**
   * Attach audio ingestion handler to a WebSocket connection
   */
  attachHandler(context: AudioIngestionGatewayContext): void {
    const { ws, connId, nodeId } = context;

    if (!this.config.enabled) {
      this.log.debug(`Audio ingestion disabled, skipping attachment for conn=${connId}`);
      return;
    }

    // Check if we already have a handler for this connection
    if (this.handlers.has(connId)) {
      this.log.warn(`Handler already exists for conn=${connId}, removing old handler`);
      this.removeHandler(connId);
    }

    // Create callbacks
    const callbacks: WsAudioHandlerCallbacks = {
      onStreamStart: (streamId) => {
        this.log.info(`Audio stream started: streamId=${streamId}, nodeId=${nodeId}`);
        context.log.info(`Audio stream started: streamId=${streamId}`);
      },

      onStreamEnd: (streamId, filePath) => {
        this.log.info(`Audio stream ended: streamId=${streamId}, file=${filePath}`);
        context.log.info(`Audio stream ended: streamId=${streamId}`);
      },

      onTranscription: (streamId, text) => {
        this.log.info(`Transcription completed: streamId=${streamId}, textLength=${text.length}`);
        context.log.info(`Transcription completed: streamId=${streamId}`);

        // Forward transcription to node via node events
        this.forwardTranscriptionToNode(nodeId, streamId, text);
      },

      onError: (streamId, error) => {
        this.log.error(`Audio stream error: streamId=${streamId}, error=${error.message}`);
        context.log.error(`Audio stream error: streamId=${streamId}, error=${error.message}`);
      },
    };

    // Create WebSocket audio handler
    const handler = new WsAudioStreamHandler(
      ws,
      nodeId,
      {
        maxConcurrentStreams: this.config.maxConcurrentStreams,
        maxStreamSize: this.config.maxStreamSize,
        maxDuration: this.config.maxDuration,
        enableTranscription: this.config.enableTranscription,
        tempStoragePath: this.config.tempStoragePath,
      },
      callbacks,
      this.mediaRunner,
    );

    // Store handler
    this.handlers.set(connId, handler);

    this.log.info(`Audio ingestion handler attached: connId=${connId}, nodeId=${nodeId}`);

    // Setup cleanup on WebSocket close
    ws.on("close", () => {
      this.removeHandler(connId);
    });
  }

  /**
   * Remove and cleanup a handler
   */
  async removeHandler(connId: string): Promise<void> {
    const handler = this.handlers.get(connId);
    if (!handler) {
      return;
    }

    // Dispose handler
    await handler.dispose();

    // Remove from map
    this.handlers.delete(connId);

    this.log.info(`Audio ingestion handler removed: connId=${connId}`);
  }

  /**
   * Handle incoming audio stream message from a WebSocket
   */
  async handleMessage(connId: string, message: unknown): Promise<void> {
    const handler = this.handlers.get(connId);
    if (!handler) {
      this.log.warn(`No handler found for connId=${connId}`);
      return;
    }

    // Validate message is an audio stream message
    if (!this.isAudioStreamMessage(message)) {
      return;
    }

    // Handle the message
    await handler.handleMessage(message);
  }

  /**
   * Check if a message is an audio stream message
   */
  private isAudioStreamMessage(message: unknown): message is { type: string } {
    return (
      typeof message === "object" &&
      message !== null &&
      "type" in message &&
      typeof (message as { type?: unknown }).type === "string" &&
      (message as { type: string }).type.startsWith("audio.")
    );
  }

  /**
   * Forward transcription result to node
   */
  private forwardTranscriptionToNode(nodeId: string, streamId: string, text: string): void {
    // This would integrate with the existing node event system
    // For now, just log it
    this.log.info(`Forwarding transcription to node: nodeId=${nodeId}, streamId=${streamId}`);
  }

  /**
   * Get handler statistics
   */
  getStats(): {
    activeHandlers: number;
    config: typeof this.config;
  } {
    return {
      activeHandlers: this.handlers.size,
      config: this.config,
    };
  }

  /**
   * Dispose of all resources
   */
  async dispose(): Promise<void> {
    // Remove all handlers
    for (const connId of this.handlers.keys()) {
      await this.removeHandler(connId);
    }

    this.handlers.clear();
  }
}

// Re-export types
export type { AudioIngestionGatewayConfig, AudioIngestionGatewayContext };
