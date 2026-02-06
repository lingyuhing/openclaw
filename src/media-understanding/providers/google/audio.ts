import type { AudioTranscriptionRequest, AudioTranscriptionResult } from "../../types.js";
import { normalizeGoogleModelId } from "../../../agents/models-config.providers.js";
import { fetchWithTimeoutGuarded, normalizeBaseUrl, readErrorResponse } from "../shared.js";

export const DEFAULT_GOOGLE_AUDIO_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GOOGLE_AUDIO_MODEL = "gemini-3-flash-preview";
const DEFAULT_GOOGLE_AUDIO_PROMPT = "Transcribe the audio.";

function resolveModel(model?: string): string {
  const trimmed = model?.trim();
  if (!trimmed) {
    return DEFAULT_GOOGLE_AUDIO_MODEL;
  }
  return normalizeGoogleModelId(trimmed);
}

function resolvePrompt(prompt?: string): string {
  const trimmed = prompt?.trim();
  return trimmed || DEFAULT_GOOGLE_AUDIO_PROMPT;
}

/**
 * Google Cloud STT response types for diarization
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

type GoogleAlternative = {
  transcript: string;
  confidence?: number;
  words?: GoogleWordInfo[];
};

type GoogleResult = {
  alternatives?: GoogleAlternative[];
  resultEndTime?: {
    seconds: number;
    nanos?: number;
  };
  channelTag?: number;
  languageCode?: string;
};

type GoogleResponse = {
  results?: GoogleResult[];
  totalBilledTime?: {
    seconds: number;
    nanos?: number;
  };
  requestId?: string;
};

export async function transcribeGeminiAudio(
  params: AudioTranscriptionRequest,
): Promise<AudioTranscriptionResult> {
  const fetchFn = params.fetchFn ?? fetch;
  const baseUrl = normalizeBaseUrl(params.baseUrl, DEFAULT_GOOGLE_AUDIO_BASE_URL);
  const allowPrivate = Boolean(params.baseUrl?.trim());
  const model = resolveModel(params.model);
  const url = `${baseUrl}/models/${model}:generateContent`;

  const headers = new Headers(params.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (!headers.has("x-goog-api-key")) {
    headers.set("x-goog-api-key", params.apiKey);
  }

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: resolvePrompt(params.prompt) },
          {
            inline_data: {
              mime_type: params.mime ?? "audio/wav",
              data: params.buffer.toString("base64"),
            },
          },
        ],
      },
    ],
  };

  const { response: res, release } = await fetchWithTimeoutGuarded(
    url,
    {
      method: "POST",
      headers,
      body: JSON.stringify(body),
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

    const payload = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const parts = payload.candidates?.[0]?.content?.parts ?? [];
    const text = parts
      .map((part) => part?.text?.trim())
      .filter(Boolean)
      .join("\n");
    if (!text) {
      throw new Error("Audio transcription response missing text");
    }

    // Check if the response contains speaker labels (diarization)
    const hasSpeakerLabels = text.includes("Speaker") || text.includes(":");

    if (hasSpeakerLabels) {
      // Try to parse speaker labels from the transcript
      const diarizationData = parseSpeakerLabelsFromText(text);
      return {
        text,
        model,
        diarization: diarizationData,
      };
    }

    return { text, model };
  } finally {
    await release();
  }
}

/**
 * Parse speaker labels from transcript text
 * Handles formats like:
 * - "Speaker 0: Hello world"
 * - "Speaker 1 (ABC123...): How are you?"
 */
function parseSpeakerLabelsFromText(text: string): {
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

  // Split text by newlines and parse each line
  const lines = text.split("\n");
  const speakerSet = new Set<number>();
  let currentTime = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match patterns like "Speaker 0:", "Speaker 1 (ABC123...):", "Speaker 2:"
    const match = trimmed.match(/^Speaker\s+(\d+)(?:\s*\([^)]*\))?\s*:\s*(.+)$/i);
    if (match) {
      const speakerId = parseInt(match[1], 10);
      const text = match[2].trim();
      speakerSet.add(speakerId);

      // Estimate timing (2 words per second)
      const wordCount = text.split(/\s+/).length;
      const duration = Math.max(1, wordCount / 2);

      segments.push({
        speakerId,
        startTime: currentTime,
        endTime: currentTime + duration,
        text,
      });

      currentTime += duration + 0.5; // Add pause between segments
    }
  }

  // Build formatted output
  const outputLines: string[] = [];
  let currentSpeakerId: number | null = null;

  for (const segment of segments) {
    if (segment.speakerId !== currentSpeakerId) {
      currentSpeakerId = segment.speakerId;
      outputLines.push(`Speaker ${segment.speakerId}:`);
    }
    outputLines.push(`  ${segment.text}`);
  }

  const formattedOutput = outputLines.join("\n").trim();

  return {
    segments,
    speakerCount: speakerSet.size,
    formattedOutput,
  };
}
