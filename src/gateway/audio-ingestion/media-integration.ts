/**
 * Media Understanding Integration
 *
 * Integrates the audio ingestion system with the existing
 * Media Understanding system for STT processing.
 */

import type { OpenClawConfig } from "../../config/types.js";
import type {
  AudioTranscriptionRequest,
  AudioTranscriptionResult,
  MediaUnderstandingProvider,
} from "../../media-understanding/types.js";
import { runMediaUnderstanding } from "../../media-understanding/runner.js";

export interface TranscriptionOptions {
  audioData: Buffer;
  format: string;
  sampleRate: number;
  channels: number;
  language?: string;
  diarization?: boolean;
  speakerCountMin?: number;
  speakerCountMax?: number;
}

export interface TranscriptionResult {
  text: string;
  confidence?: number;
  language?: string;
  duration?: number;
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

export class MediaUnderstandingRunner {
  private config: OpenClawConfig;
  private providerRegistry: Map<string, MediaUnderstandingProvider>;

  constructor(config: OpenClawConfig) {
    this.config = config;
    this.providerRegistry = new Map();
  }

  /**
   * Transcribe audio using Media Understanding
   */
  async transcribe(options: TranscriptionOptions): Promise<TranscriptionResult> {
    const startTime = Date.now();

    // Build the transcription request
    const request: AudioTranscriptionRequest = {
      buffer: options.audioData,
      fileName: `audio.${options.format}`,
      mime: this.getMimeType(options.format),
      apiKey: this.getApiKey(),
      model: this.getModel(),
      language: options.language,
      timeoutMs: 120000, // 2 minutes
      diarization: options.diarization
        ? {
            enabled: true,
            speakerCountMin: options.speakerCountMin,
            speakerCountMax: options.speakerCountMax,
          }
        : undefined,
    };

    try {
      // Run transcription through Media Understanding
      const result = await this.runTranscription(request);

      const processingTime = Date.now() - startTime;

      return {
        text: result.text,
        confidence: 0.9, // Default confidence
        language: options.language,
        duration: this.estimateDuration(options.audioData.length, options.format),
        speakers: result.diarization?.segments.map((s, index) => ({
          id: String(s.speakerId),
          label: `Speaker ${s.speakerId + 1}`,
          startTime: s.startTime,
          endTime: s.endTime,
          confidence: s.confidence,
        })),
        metadata: {
          provider: result.provider || "unknown",
          model: result.model || "unknown",
          processingTime,
        },
      };
    } catch (error) {
      throw new Error(
        `Transcription failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Run transcription through Media Understanding runner
   */
  private async runTranscription(
    request: AudioTranscriptionRequest,
  ): Promise<AudioTranscriptionResult & { provider?: string }> {
    // Use the existing Media Understanding runner
    const result = await runMediaUnderstanding({
      config: this.config,
      capability: "audio",
      attachments: [
        {
          path: request.fileName,
          mime: request.mime,
          index: 0,
        },
      ],
      overrides: {},
    });

    // Extract transcription from result
    const output = result.outputs[0];
    if (!output || output.kind !== "audio.transcription") {
      throw new Error("No transcription output from Media Understanding");
    }

    return {
      text: output.text,
      model: output.model,
      provider: output.provider,
    };
  }

  /**
   * Get MIME type for audio format
   */
  private getMimeType(format: string): string {
    switch (format) {
      case "opus":
        return "audio/opus";
      case "pcm":
        return "audio/pcm";
      case "wav":
        return "audio/wav";
      case "aac":
        return "audio/aac";
      default:
        return "audio/unknown";
    }
  }

  /**
   * Get API key from config
   */
  private getApiKey(): string {
    // Get from config - this should be configured per provider
    return this.config.gateway?.audioIngestion?.apiKey || "";
  }

  /**
   * Get model from config
   */
  private getModel(): string | undefined {
    return this.config.gateway?.audioIngestion?.model;
  }

  /**
   * Estimate audio duration from file size and format
   */
  private estimateDuration(fileSize: number, format: string): number {
    // Typical bitrates
    const bitrates: Record<string, number> = {
      opus: 24000, // 24 kbps
      pcm: 256000, // 256 kbps (16kHz, 16-bit, mono)
      wav: 256000,
      aac: 128000, // 128 kbps
    };

    const bitrate = bitrates[format] || 128000;
    return Math.round(((fileSize * 8) / bitrate) * 1000); // Duration in ms
  }
}

// Re-export types
export type { TranscriptionOptions, TranscriptionResult };
