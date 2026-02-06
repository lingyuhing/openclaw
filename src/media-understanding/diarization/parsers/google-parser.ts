/**
 * Google Cloud Speech-to-Text response parser for speaker diarization
 * Extracts speaker segments from Google Cloud STT API responses
 */

import type { SpeakerSegment, STTDiarizationResponse } from "../types.js";

/**
 * Google Cloud STT word info structure
 */
type GoogleWordInfo = {
  startOffset?: {
    seconds: number;
    nanos?: number;
  };
  endOffset?: {
    seconds: number;
    nanos?: number;
  };
  word: string;
  confidence?: number;
  speakerTag?: number;
};

/**
 * Google Cloud STT alternative structure
 */
type GoogleAlternative = {
  transcript: string;
  confidence?: number;
  words?: GoogleWordInfo[];
};

/**
 * Google Cloud STT result structure
 */
type GoogleResult = {
  alternatives?: GoogleAlternative[];
  resultEndTime?: {
    seconds: number;
    nanos?: number;
  };
  channelTag?: number;
  languageCode?: string;
};

/**
 * Google Cloud STT response structure
 */
type GoogleResponse = {
  results?: GoogleResult[];
  totalBilledTime?: {
    seconds: number;
    nanos?: number;
  };
  requestId?: string;
};

/**
 * Parse Google Cloud STT diarization response
 *
 * @param rawResponse - Raw response from Google Cloud STT API
 * @param model - Model name used for transcription
 * @returns Parsed STT diarization response
 */
export function parseGoogleDiarizationResponse(
  rawResponse: unknown,
  model: string,
): STTDiarizationResponse {
  const response = rawResponse as GoogleResponse;
  const segments = extractSegments(response);

  return {
    provider: "google",
    model,
    raw: response,
    segments,
  };
}

/**
 * Extract speaker segments from Google Cloud STT response
 */
function extractSegments(response: GoogleResponse): SpeakerSegment[] {
  const segments: SpeakerSegment[] = [];
  const results = response.results ?? [];

  for (const result of results) {
    const alternatives = result.alternatives ?? [];
    const alternative = alternatives[0];

    if (!alternative?.words || alternative.words.length === 0) {
      continue;
    }

    // Group consecutive words by the same speaker
    let currentSegment: SpeakerSegment | null = null;

    for (const wordInfo of alternative.words) {
      // Skip words without speaker tag
      if (typeof wordInfo.speakerTag !== "number") {
        continue;
      }

      // Calculate timing
      const startTime = wordInfo.startOffset
        ? wordInfo.startOffset.seconds + (wordInfo.startOffset.nanos ?? 0) / 1e9
        : 0;
      const endTime = wordInfo.endOffset
        ? wordInfo.endOffset.seconds + (wordInfo.endOffset.nanos ?? 0) / 1e9
        : startTime + 0.1;

      if (
        !currentSegment ||
        currentSegment.speakerId !== wordInfo.speakerTag - 1 // Google uses 1-based indexing
      ) {
        // Start a new segment
        if (currentSegment) {
          segments.push(currentSegment);
        }
        currentSegment = {
          speakerId: wordInfo.speakerTag - 1, // Convert to 0-based indexing
          startTime,
          endTime,
          text: wordInfo.word,
          confidence: wordInfo.confidence,
        };
      } else {
        // Continue current segment
        currentSegment.endTime = endTime;
        currentSegment.text += ` ${wordInfo.word}`;
        if (wordInfo.confidence !== undefined && currentSegment.confidence !== undefined) {
          // Update confidence to average
          currentSegment.confidence = (currentSegment.confidence + wordInfo.confidence) / 2;
        }
      }
    }

    // Add the last segment
    if (currentSegment) {
      segments.push(currentSegment);
    }
  }

  return segments;
}

/**
 * Build Google Cloud STT diarization request configuration
 *
 * @param options - Diarization options
 * @returns Configuration object for Google Cloud STT API
 */
export function buildGoogleDiarizationConfig(
  options: {
    enableSpeakerDiarization?: boolean;
    diarizationSpeakerCountMin?: number;
    diarizationSpeakerCountMax?: number;
    enableWordTimeOffsets?: boolean;
    model?: string;
  } = {},
): Record<string, unknown> {
  const config: Record<string, unknown> = {};

  if (options.enableSpeakerDiarization) {
    config.enableSpeakerDiarization = true;

    if (options.diarizationSpeakerCountMin !== undefined) {
      config.diarizationSpeakerCountMin = options.diarizationSpeakerCountMin;
    }

    if (options.diarizationSpeakerCountMax !== undefined) {
      config.diarizationSpeakerCountMax = options.diarizationSpeakerCountMax;
    }
  }

  if (options.enableWordTimeOffsets) {
    config.enableWordTimeOffsets = true;
  }

  if (options.model) {
    config.model = options.model;
  }

  return config;
}
