import type { AudioTranscriptionRequest, AudioTranscriptionResult } from "../../types.js";
import { fetchWithTimeoutGuarded, normalizeBaseUrl, readErrorResponse } from "../shared.js";

export const DEFAULT_DEEPGRAM_AUDIO_BASE_URL = "https://api.deepgram.com/v1";
export const DEFAULT_DEEPGRAM_AUDIO_MODEL = "nova-3";

function resolveModel(model?: string): string {
  const trimmed = model?.trim();
  return trimmed || DEFAULT_DEEPGRAM_AUDIO_MODEL;
}

type DeepgramWord = {
  word: string;
  start: number;
  end: number;
  speaker?: number;
  confidence?: number;
  punctuated_word?: string;
};

type DeepgramAlternative = {
  transcript?: string;
  words?: DeepgramWord[];
  confidence?: number;
};

type DeepgramChannel = {
  alternatives?: DeepgramAlternative[];
};

type DeepgramResult = {
  channels?: DeepgramChannel[];
};

type DeepgramTranscriptResponse = {
  results?: DeepgramResult;
  metadata?: {
    model_info?: {
      name?: string;
    };
  };
};

export async function transcribeDeepgramAudio(
  params: AudioTranscriptionRequest,
): Promise<AudioTranscriptionResult> {
  const fetchFn = params.fetchFn ?? fetch;
  const baseUrl = normalizeBaseUrl(params.baseUrl, DEFAULT_DEEPGRAM_AUDIO_BASE_URL);
  const allowPrivate = Boolean(params.baseUrl?.trim());
  const model = resolveModel(params.model);

  const url = new URL(`${baseUrl}/listen`);
  url.searchParams.set("model", model);
  if (params.language?.trim()) {
    url.searchParams.set("language", params.language.trim());
  }

  // Merge diarization and other query parameters
  if (params.query) {
    for (const [key, value] of Object.entries(params.query)) {
      if (value === undefined) {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }

  const headers = new Headers(params.headers);
  if (!headers.has("authorization")) {
    headers.set("authorization", `Token ${params.apiKey}`);
  }
  if (!headers.has("content-type")) {
    headers.set("content-type", params.mime ?? "application/octet-stream");
  }

  const body = new Uint8Array(params.buffer);
  const { response: res, release } = await fetchWithTimeoutGuarded(
    url.toString(),
    {
      method: "POST",
      headers,
      body,
    },
    params.timeoutMs,
    fetchFn,
    allowPrivate ? { ssrfPolicy: { allowPrivateNetwork: true } } : undefined,
  );

  try {
    if (!res.ok) {
      const detail = await readErrorResponse(res);
      const suffix = detail ? `: ${detail}` : "";
      throw new Error(`Audio transcription failed (HTTP ${res.status})${suffix}`);
    }

    const payload = (await res.json()) as DeepgramTranscriptResponse;

    // Check if diarization was requested and has speaker data
    const channel = payload.results?.channels?.[0];
    const alternative = channel?.alternatives?.[0];
    const words = alternative?.words ?? [];
    const hasDiarization = words.some((w) => typeof w.speaker === "number");

    // Build transcript text
    let transcript: string;
    if (alternative?.transcript) {
      transcript = alternative.transcript.trim();
    } else if (words.length > 0) {
      // Concatenate words
      transcript = words.map((w) => w.punctuated_word ?? w.word).join(" ");
    } else {
      throw new Error("Audio transcription response missing transcript");
    }

    // If diarization data is present, return enhanced result
    if (hasDiarization) {
      const diarizationData = buildDiarizationResult(payload, transcript);
      return {
        text: transcript,
        model: payload.metadata?.model_info?.name ?? model,
        diarization: diarizationData,
      };
    }

    return { text: transcript, model: payload.metadata?.model_info?.name ?? model };
  } finally {
    await release();
  }
}

/**
 * Build diarization result from Deepgram response
 */
function buildDiarizationResult(
  payload: DeepgramTranscriptResponse,
  fullTranscript: string,
): {
  segments: Array<{
    speakerId: number;
    startTime: number;
    endTime: number;
    text: string;
    confidence?: number;
  }>;
  speakerCount: number;
  formattedOutput: string;
} {
  const segments: Array<{
    speakerId: number;
    startTime: number;
    endTime: number;
    text: string;
    confidence?: number;
  }> = [];

  const words = payload.results?.channels?.[0]?.alternatives?.[0]?.words ?? [];

  // Group consecutive words by the same speaker
  let currentSegment: (typeof segments)[0] | null = null;

  for (const word of words) {
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
        text: word.punctuated_word ?? word.word,
        confidence: word.confidence,
      };
    } else {
      // Continue current segment
      currentSegment.endTime = word.end;
      currentSegment.text += ` ${word.punctuated_word ?? word.word}`;
      if (word.confidence !== undefined && currentSegment.confidence !== undefined) {
        currentSegment.confidence = (currentSegment.confidence + word.confidence) / 2;
      }
    }
  }

  // Add the last segment
  if (currentSegment) {
    segments.push(currentSegment);
  }

  // Get unique speaker count
  const uniqueSpeakers = new Set(segments.map((s) => s.speakerId));
  const speakerCount = uniqueSpeakers.size;

  // Build formatted output
  const lines: string[] = [];
  let currentSpeakerId: number | null = null;

  for (const segment of segments) {
    if (segment.speakerId !== currentSpeakerId) {
      currentSpeakerId = segment.speakerId;
      lines.push(`\nSpeaker ${segment.speakerId}:`);
    }
    lines.push(`  ${segment.text}`);
  }

  const formattedOutput = lines.join("\n").trim();

  return {
    segments,
    speakerCount,
    formattedOutput,
  };
}
