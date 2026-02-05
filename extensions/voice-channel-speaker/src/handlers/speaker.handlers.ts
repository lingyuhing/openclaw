/**
 * Enhanced Speaker handlers for Gateway methods
 * Supports multi-sample enrollment, real-time identification, and verification
 */

import type { SpeakerRecognitionService } from "../speaker/SpeakerRecognitionService.js";
import type {
  SpeakerEnrollmentRequest,
  SpeakerIdentificationRequest,
  SpeakerDeleteRequest,
  MultiSampleEnrollmentRequest,
  SpeakerVerificationRequest,
  RealtimeIdentificationOptions,
} from "../types/speaker.types.js";

interface HandlerContext {
  params: Record<string, unknown>;
  respond: (ok: boolean, payload: unknown) => void;
}

export function createSpeakerHandlers(service: SpeakerRecognitionService) {
  return {
    /**
     * Enroll a new speaker (single sample)
     * Params: { audioData: string, gender?: 'M'|'F'|'U', sampleRate?: number, bitDepth?: number }
     * Response: { speakerId: string, hash: string, confidence: number, isUpdate?: boolean, enrollmentCount?: number }
     */
    async enroll({ params, respond }: HandlerContext): Promise<void> {
      try {
        const request: SpeakerEnrollmentRequest = {
          audioData: params.audioData as string,
          gender: params.gender as "M" | "F" | "U" | undefined,
          sampleRate: params.sampleRate as number | undefined,
          bitDepth: params.bitDepth as number | undefined,
        };

        const result = await service.enroll(request);
        respond(true, result);
      } catch (error) {
        respond(false, {
          code: "ENROLL_FAILED",
          message: error instanceof Error ? error.message : "Enrollment failed",
        });
      }
    },

    /**
     * Enroll speaker with multiple samples (recommended for >85% accuracy)
     * Params: { samples: Array<{ audioData: string, sampleRate?: number, bitDepth?: number }>, gender?: 'M'|'F'|'U' }
     * Response: { speakerId: string, hash: string, confidence: number, enrollmentCount: number, qualityReport: {...} }
     */
    async enrollMulti({ params, respond }: HandlerContext): Promise<void> {
      try {
        const request: MultiSampleEnrollmentRequest = {
          samples:
            (params.samples as Array<{
              audioData: string;
              sampleRate?: number;
              bitDepth?: number;
            }>) || [],
          gender: params.gender as "M" | "F" | "U" | undefined,
        };

        const result = await service.enrollMultiSample(request);
        respond(true, result);
      } catch (error) {
        respond(false, {
          code: "MULTI_ENROLL_FAILED",
          message: error instanceof Error ? error.message : "Multi-sample enrollment failed",
        });
      }
    },

    /**
     * Identify speaker from audio
     * Params: { audioData: string, threshold?: number, sampleRate?: number, bitDepth?: number }
     * Response: { speakerId: string, confidence: number, isKnown: boolean, quality?: number }
     */
    async identify({ params, respond }: HandlerContext): Promise<void> {
      try {
        const request: SpeakerIdentificationRequest = {
          audioData: params.audioData as string,
          threshold: params.threshold as number | undefined,
          sampleRate: params.sampleRate as number | undefined,
          bitDepth: params.bitDepth as number | undefined,
        };

        const result = await service.identify(request);
        respond(true, result);
      } catch (error) {
        respond(false, {
          code: "IDENTIFY_FAILED",
          message: error instanceof Error ? error.message : "Identification failed",
        });
      }
    },

    /**
     * Real-time streaming identification
     * Params: { audioChunk: string, options?: { windowSize?: number, hopSize?: number, minConfidence?: number } }
     * Response: { speakerId: string | null, confidence: number, isKnown: boolean, isProcessing: boolean, bufferedSamples: number }
     */
    async identifyRealtime({ params, respond }: HandlerContext): Promise<void> {
      try {
        const audioChunk = params.audioChunk as string;
        const options: RealtimeIdentificationOptions = {
          windowSize: params.windowSize as number | undefined,
          hopSize: params.hopSize as number | undefined,
          minConfidence: params.minConfidence as number | undefined,
          smoothingWindow: params.smoothingWindow as number | undefined,
        };

        const result = await service.identifyRealtime(audioChunk, options);
        respond(true, result);
      } catch (error) {
        respond(false, {
          code: "REALTIME_IDENTIFY_FAILED",
          message: error instanceof Error ? error.message : "Real-time identification failed",
        });
      }
    },

    /**
     * Verify speaker identity (1:1 comparison)
     * Params: { speakerId: string, audioData: string, threshold?: number, sampleRate?: number, bitDepth?: number }
     * Response: { speakerId: string, isVerified: boolean, confidence: number, maxSimilarity?: number, averageSimilarity?: number }
     */
    async verify({ params, respond }: HandlerContext): Promise<void> {
      try {
        const request: SpeakerVerificationRequest = {
          speakerId: params.speakerId as string,
          audioData: params.audioData as string,
          threshold: params.threshold as number | undefined,
          sampleRate: params.sampleRate as number | undefined,
          bitDepth: params.bitDepth as number | undefined,
        };

        const result = await service.verify(request);
        respond(true, result);
      } catch (error) {
        respond(false, {
          code: "VERIFY_FAILED",
          message: error instanceof Error ? error.message : "Verification failed",
        });
      }
    },

    /**
     * List all enrolled speakers
     * Response: { speakers: Array<{id, hash, gender, createdAt, enrollmentCount}>, totalCount: number }
     */
    async list({ respond }: HandlerContext): Promise<void> {
      try {
        const result = await service.list();
        respond(true, result);
      } catch (error) {
        respond(false, {
          code: "LIST_FAILED",
          message: error instanceof Error ? error.message : "Failed to list speakers",
        });
      }
    },

    /**
     * Get speaker details
     * Params: { speakerId: string }
     * Response: SpeakerEmbedding object
     */
    async get({ params, respond }: HandlerContext): Promise<void> {
      try {
        const speakerId = params.speakerId as string;
        const result = await service.getSpeaker(speakerId);
        if (result) {
          respond(true, result);
        } else {
          respond(false, {
            code: "SPEAKER_NOT_FOUND",
            message: `Speaker ${speakerId} not found`,
          });
        }
      } catch (error) {
        respond(false, {
          code: "GET_FAILED",
          message: error instanceof Error ? error.message : "Failed to get speaker",
        });
      }
    },

    /**
     * Delete a speaker
     * Params: { speakerId: string }
     * Response: { success: boolean }
     */
    async delete({ params, respond }: HandlerContext): Promise<void> {
      try {
        const request: SpeakerDeleteRequest = {
          speakerId: params.speakerId as string,
        };

        const success = await service.delete(request.speakerId);
        respond(true, { success });
      } catch (error) {
        respond(false, {
          code: "DELETE_FAILED",
          message: error instanceof Error ? error.message : "Failed to delete speaker",
        });
      }
    },

    /**
     * Get recognition statistics
     * Response: { totalSpeakers: number, totalEmbeddings: number, averageEmbeddingsPerSpeaker: number, currentThreshold: number }
     */
    async stats({ respond }: HandlerContext): Promise<void> {
      try {
        const result = service.getStats();
        respond(true, result);
      } catch (error) {
        respond(false, {
          code: "STATS_FAILED",
          message: error instanceof Error ? error.message : "Failed to get stats",
        });
      }
    },

    /**
     * Set identification threshold
     * Params: { threshold: number }
     * Response: { success: boolean, previousThreshold: number, newThreshold: number }
     */
    async setThreshold({ params, respond }: HandlerContext): Promise<void> {
      try {
        const newThreshold = params.threshold as number;
        const previousThreshold = service.getThreshold();
        service.setThreshold(newThreshold);
        respond(true, {
          success: true,
          previousThreshold,
          newThreshold,
        });
      } catch (error) {
        respond(false, {
          code: "SET_THRESHOLD_FAILED",
          message: error instanceof Error ? error.message : "Failed to set threshold",
        });
      }
    },
  };
}
