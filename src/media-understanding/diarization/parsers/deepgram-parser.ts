/**
 * Deepgram response parser for speaker diarization
 * Extracts speaker segments from Deepgram API responses
 */

import type { SpeakerSegment, STTDiarizationResponse } from "../types.js";

/**
 * Deepgram word object structure
 */
type DeepgramWord = {
  word: string;
  start: number;
  end: number;
  speaker: number;
  confidence?: number;
  punctuated_word?: string;
};

/**
 * Deepgram paragraph structure
 */
type DeepgramParagraph = {
  sentences: Array<{
    text: string;
    start: number;
    end: number;
  }>;
  speaker: number;
  num_words: number;
};

/**
 * Deepgram response structure
 */
type DeepgramResponse = {
  results?: {
    channels?: Array<{
      alternatives?: Array<{
        transcript?: string;
        words?: DeepgramWord[];
        paragraphs?: {
          transcript?: string;
          paragraphs?: DeepgramParagraph[];
        };
      }>;
    }>;
  };
};

/**
 * Parse Deepgram diarization response
 *
 * @param rawResponse - Raw response from Deepgram API
 * @param model - Model name used for transcription
 * @returns Parsed STT diarization response
 */
export function parseDeepgramDiarizationResponse(
  rawResponse: unknown,
  model: string,
): STTDiarizationResponse {
  const response = rawResponse as DeepgramResponse;
  const segments = extractSegments(response);

  return {
    provider: "deepgram",
    model,
    raw: response,
    segments,
  };
}

/**
 * Extract speaker segments from Deepgram response
 */
function extractSegments(response: DeepgramResponse): SpeakerSegment[] {
  const segments: SpeakerSegment[] = [];

  // Get words from response
  const words = response.results?.channels?.[0]?.alternatives?.[0]?.words ?? [];

  if (!words || words.length === 0) {
    return segments;
  }

  // Group consecutive words by the same speaker
  let currentSegment: SpeakerSegment | null = null;

  for (const word of words) {
    // Skip words without speaker info
    if (typeof word.speaker !== "number") {
      continue;
    }

    if (!currentSegment || currentSegment.speakerId !== word.speaker) {
      // Start a new segment
      if (currentSegment) {
        segments.push(currentSegment);
      }
      currentSegment = {
        speakerId: word.speaker,
        startTime: word.start,
        endTime: word.end,
        text: word.punctuated_word || word.word,
        confidence: word.confidence,
      };
    } else {
      // Continue current segment
      currentSegment.endTime = word.end;
      currentSegment.text += ` ${word.punctuated_word || word.word}`;
      if (word.confidence !== undefined) {
        // Update confidence to average
        const currentConfidence = currentSegment.confidence ?? 0;
        currentSegment.confidence = (currentConfidence + word.confidence) / 2;
      }
    }
  }

  // Add the last segment
  if (currentSegment) {
    segments.push(currentSegment);
  }

  return segments;
}

/**
 * Build Deepgram diarization query parameters
 *
 * @param options - Diarization options
 * @returns Query parameters for Deepgram API
 */
export function buildDeepgramDiarizationQuery(
  options: {
    diarization?: boolean;
    diarizationVersion?: string;
    utterances?: boolean;
    smartFormat?: boolean;
    punctuate?: boolean;
  } = {},
): Record<string, string | number | boolean> {
  const query: Record<string, string | number | boolean> = {};

  if (options.diarization) {
    query.diarization = true;

    if (options.diarizationVersion) {
      query.diarization_version = options.diarizationVersion;
    }
  }

  if (options.utterances) {
    query.utterances = true;
  }

  if (options.smartFormat) {
    query.smart_format = true;
  }

  if (options.punctuate) {
    query.punctuate = true;
  }

  return query;
}
