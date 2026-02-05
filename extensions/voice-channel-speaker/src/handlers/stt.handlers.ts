/**
 * STT handlers for Gateway methods
 */

import type { NanSttService } from "../stt/NanSttService.js";
import type { SttLanguage } from "../types/message.types.js";

interface HandlerContext {
  params: Record<string, unknown>;
  respond: (ok: boolean, payload: unknown) => void;
}

interface SttSetLanguageRequest {
  language: SttLanguage;
}

interface SttTranscribeRequest {
  audioData: string;
  language?: SttLanguage;
}

export function createSttHandlers(service: NanSttService) {
  // Current language setting
  let currentLanguage: SttLanguage = "zh";

  return {
    /**
     * Set STT language
     * Params: { language: 'zh'|'nan'|'auto' }
     * Response: { success: boolean }
     */
    async setLanguage({ params, respond }: HandlerContext): Promise<void> {
      try {
        const request = params as unknown as SttSetLanguageRequest;
        const validLanguages: SttLanguage[] = ["zh", "nan", "auto"];

        if (!validLanguages.includes(request.language)) {
          respond(false, {
            code: "INVALID_LANGUAGE",
            message: `Invalid language: ${request.language}. Must be one of: ${validLanguages.join(", ")}`,
          });
          return;
        }

        currentLanguage = request.language;
        respond(true, { success: true });
      } catch (error) {
        respond(false, {
          code: "SET_LANGUAGE_FAILED",
          message: error instanceof Error ? error.message : "Failed to set language",
        });
      }
    },

    /**
     * Get current STT language
     * Response: { language: string }
     */
    async getLanguage({ respond }: HandlerContext): Promise<void> {
      respond(true, { language: currentLanguage });
    },

    /**
     * Transcribe audio
     * Params: { audioData: string, language?: 'zh'|'nan'|'auto' }
     * Response: { text: string, language: string }
     */
    async transcribe({ params, respond }: HandlerContext): Promise<void> {
      try {
        if (!service.isConfigured()) {
          respond(false, {
            code: "NOT_CONFIGURED",
            message: "STT service not configured. Please set OpenAI API key.",
          });
          return;
        }

        const request = params as unknown as SttTranscribeRequest;
        const audioData = Buffer.from(request.audioData, "base64");
        const language = request.language || currentLanguage;

        let result: { text: string; language: string };

        if (language === "nan") {
          const text = await service.transcribe(audioData);
          result = { text, language: "nan" };
        } else if (language === "auto") {
          result = await service.transcribeWithFallback(audioData);
        } else {
          // For other languages, use auto-detection
          result = await service.transcribeWithFallback(audioData);
        }

        respond(true, result);
      } catch (error) {
        respond(false, {
          code: "TRANSCRIBE_FAILED",
          message: error instanceof Error ? error.message : "Transcription failed",
        });
      }
    },

    /**
     * Get current language setting
     * Internal method for event emission
     */
    getCurrentLanguage(): SttLanguage {
      return currentLanguage;
    },
  };
}
