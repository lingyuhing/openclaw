import type { DiarizationResult, SpeakerSegment, SpeakerMapping, VoiceprintId } from "./types.js";
import { generateVoiceprintId } from "./voiceprint-id-generator.js";

/**
 * Default configuration for transcript formatting
 */
const DEFAULT_CONFIG = {
  speakerLabelFormat: "Speaker {id}",
  includeTimestamps: false,
  timestampFormat: "[MM:SS]",
  lineSeparator: "\n",
  utteranceSeparator: "\n\n",
};

/**
 * Formats a timestamp in MM:SS or HH:MM:SS format
 */
function formatTimestamp(seconds: number, includeHours = false): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (includeHours || hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Generates a display label for a speaker
 */
function generateSpeakerLabel(
  mapping: SpeakerMapping,
  format: string = DEFAULT_CONFIG.speakerLabelFormat,
): string {
  // Extract the hash prefix for display (first 8 chars after "vpr_")
  const shortId = mapping.voiceprintId.slice(4, 12);

  return format
    .replace("{id}", mapping.sttSpeakerId.toString())
    .replace("{voiceprint}", mapping.voiceprintId)
    .replace("{shortId}", shortId)
    .replace("{alias}", mapping.displayLabel || "");
}

/**
 * Formats speaker segments into a structured transcript
 */
export function formatTranscript(
  segments: SpeakerSegment[],
  speakerMappings: SpeakerMapping[],
  options: Partial<typeof DEFAULT_CONFIG> = {},
): string {
  const config = { ...DEFAULT_CONFIG, ...options };

  if (segments.length === 0) {
    return "";
  }

  // Create a map for quick speaker lookup
  const speakerMap = new Map<number, SpeakerMapping>();
  for (const mapping of speakerMappings) {
    speakerMap.set(mapping.sttSpeakerId, mapping);
  }

  // Group consecutive segments by the same speaker
  const utterances: Array<{
    speakerId: number;
    startTime: number;
    endTime: number;
    text: string;
  }> = [];

  let currentUtterance: (typeof utterances)[0] | null = null;

  for (const segment of segments) {
    if (!currentUtterance || currentUtterance.speakerId !== segment.speakerId) {
      // Start a new utterance
      if (currentUtterance) {
        utterances.push(currentUtterance);
      }
      currentUtterance = {
        speakerId: segment.speakerId,
        startTime: segment.startTime,
        endTime: segment.endTime,
        text: segment.text,
      };
    } else {
      // Continue current utterance
      currentUtterance.endTime = segment.endTime;
      currentUtterance.text += " " + segment.text;
    }
  }

  // Add the last utterance
  if (currentUtterance) {
    utterances.push(currentUtterance);
  }

  // Format each utterance
  const lines: string[] = [];

  for (const utterance of utterances) {
    const mapping = speakerMap.get(utterance.speakerId);
    if (!mapping) continue;

    const speakerLabel = generateSpeakerLabel(mapping, config.speakerLabelFormat);
    let line = `${speakerLabel}: ${utterance.text}`;

    if (config.includeTimestamps) {
      const timestamp = formatTimestamp(utterance.startTime);
      line = `[${timestamp}] ${line}`;
    }

    lines.push(line);
  }

  return lines.join(config.lineSeparator);
}

/**
 * Formats diarization result with speaker information header
 */
export function formatDiarizationOutput(
  result: DiarizationResult,
  options: Partial<typeof DEFAULT_CONFIG> = {},
): string {
  if (!result.success) {
    return `[Audio transcription failed: ${result.error || "Unknown error"}]`;
  }

  const config = { ...DEFAULT_CONFIG, ...options };
  const lines: string[] = [];

  // Header with speaker count
  lines.push(
    `[Audio - ${result.speakerCount} speaker${result.speakerCount !== 1 ? "s" : ""} detected]`,
  );
  lines.push("");

  // Speaker details
  for (const mapping of result.speakerMappings) {
    const shortId = mapping.voiceprintId.slice(4, 12);
    const duration = Math.round(mapping.totalDuration);
    lines.push(
      `# Speaker ${mapping.sttSpeakerId} (ID: ${shortId}...): ${mapping.segmentCount} segments, ~${duration}s`,
    );
  }
  lines.push("");

  // Transcript
  const transcript = formatTranscript(result.segments, result.speakerMappings, config);
  lines.push(transcript);

  return lines.join("\n");
}

/**
 * Creates a simplified transcript format without metadata
 */
export function createSimpleTranscript(
  segments: SpeakerSegment[],
  mappings: SpeakerMapping[],
): string {
  if (segments.length === 0) return "";

  // Create speaker map
  const speakerMap = new Map<number, SpeakerMapping>();
  for (const mapping of mappings) {
    speakerMap.set(mapping.sttSpeakerId, mapping);
  }

  // Build transcript
  const lines: string[] = [];
  for (const segment of segments) {
    const mapping = speakerMap.get(segment.speakerId);
    if (!mapping) continue;

    const shortId = mapping.voiceprintId.slice(4, 12);
    lines.push(`Speaker ${segment.speakerId} (${shortId}...): ${segment.text}`);
  }

  return lines.join("\n");
}
