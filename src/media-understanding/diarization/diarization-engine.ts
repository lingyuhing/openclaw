import type {
  DiarizationConfig,
  DiarizationResult,
  SpeakerMapping,
  SpeakerSegment,
  STTDiarizationResponse,
  VoiceprintId,
} from "./types.js";
import { speakerRegistry } from "./speaker-registry.js";
import { formatDiarizationOutput } from "./transcript-formatter.js";
import { generateVoiceprintId } from "./voiceprint-id-generator.js";

/**
 * DiarizationEngine handles speaker diarization processing
 *
 * This engine:
 * 1. Parses STT provider responses with diarization data
 * 2. Extracts speaker segments with timing information
 * 3. Generates deterministic voiceprint IDs for each speaker
 * 4. Formats the output with speaker labels
 */
export class DiarizationEngine {
  private config: DiarizationConfig;

  constructor(config: DiarizationConfig) {
    this.config = {
      speakerCountMin: 1,
      speakerCountMax: 10,
      speakerLabelFormat: "Speaker {id}",
      utterances: true,
      forceVoiceprintIdForAllSpeakers: true,
      ...config,
    };
  }

  /**
   * Process diarization response from STT provider
   *
   * @param response - Raw diarization response from STT provider
   * @returns Structured diarization result
   */
  processResponse(response: STTDiarizationResponse): DiarizationResult {
    try {
      // Extract segments from response
      const segments = response.segments;

      if (segments.length === 0) {
        return {
          success: false,
          error: "No speaker segments found in response",
          segments: [],
          speakerMappings: [],
          speakerCount: 0,
          fullTranscript: "",
          formattedOutput: "",
        };
      }

      // Get unique speaker IDs
      const uniqueSpeakerIds = [...new Set(segments.map((s) => s.speakerId))].sort((a, b) => a - b);

      // Validate speaker count
      if (uniqueSpeakerIds.length < this.config.speakerCountMin!) {
        return {
          success: false,
          error: `Speaker count (${uniqueSpeakerIds.length}) below minimum (${this.config.speakerCountMin})`,
          segments,
          speakerMappings: [],
          speakerCount: uniqueSpeakerIds.length,
          fullTranscript: this.buildFullTranscript(segments),
          formattedOutput: "",
        };
      }

      if (uniqueSpeakerIds.length > this.config.speakerCountMax!) {
        return {
          success: false,
          error: `Speaker count (${uniqueSpeakerIds.length}) exceeds maximum (${this.config.speakerCountMax})`,
          segments,
          speakerMappings: [],
          speakerCount: uniqueSpeakerIds.length,
          fullTranscript: this.buildFullTranscript(segments),
          formattedOutput: "",
        };
      }

      // Generate speaker mappings with voiceprint IDs
      const speakerMappings = this.generateSpeakerMappings(segments, uniqueSpeakerIds);

      // Build full transcript
      const fullTranscript = this.buildFullTranscript(segments);

      // Format output
      const formattedOutput = formatDiarizationOutput(
        {
          success: true,
          segments,
          speakerMappings,
          speakerCount: uniqueSpeakerIds.length,
          fullTranscript,
          formattedOutput: "",
        },
        {
          speakerLabelFormat: this.config.speakerLabelFormat,
        },
      );

      return {
        success: true,
        segments,
        speakerMappings,
        speakerCount: uniqueSpeakerIds.length,
        fullTranscript,
        formattedOutput,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        segments: [],
        speakerMappings: [],
        speakerCount: 0,
        fullTranscript: "",
        formattedOutput: "",
      };
    }
  }

  /**
   * Generate speaker mappings with voiceprint IDs
   */
  private generateSpeakerMappings(
    segments: SpeakerSegment[],
    speakerIds: number[],
  ): SpeakerMapping[] {
    const mappings: SpeakerMapping[] = [];

    for (const speakerId of speakerIds) {
      // Get segments for this speaker
      const speakerSegments = segments.filter((s) => s.speakerId === speakerId);

      // Calculate total duration
      const totalDuration = speakerSegments.reduce((sum, s) => sum + (s.endTime - s.startTime), 0);

      // Generate voiceprint ID from all segments for this speaker
      const voiceprintId = generateVoiceprintId(segments, speakerId);

      // Register speaker in registry
      const featuresHash = voiceprintId.slice(4); // Remove "vpr_" prefix
      speakerRegistry.registerSpeaker(voiceprintId, totalDuration, featuresHash);

      // Create mapping
      mappings.push({
        sttSpeakerId: speakerId,
        voiceprintId,
        displayLabel: this.config.speakerLabelFormat!.replace("{id}", speakerId.toString()),
        totalDuration,
        segmentCount: speakerSegments.length,
      });
    }

    return mappings;
  }

  /**
   * Build full transcript from segments
   */
  private buildFullTranscript(segments: SpeakerSegment[]): string {
    return segments.map((s) => s.text).join(" ");
  }

  /**
   * Get the current configuration
   */
  getConfig(): DiarizationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<DiarizationConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

/**
 * Create a new DiarizationEngine instance
 */
export function createDiarizationEngine(config: DiarizationConfig): DiarizationEngine {
  return new DiarizationEngine(config);
}
