/**
 * Minnan (Hokkien) STT Service
 * Uses OpenAI Whisper API for Minnan speech recognition
 */

import OpenAI from "openai";

export class NanSttService {
  private openai: OpenAI | null = null;
  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.setApiKey(apiKey);
    }
  }

  /**
   * Set OpenAI API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return this.openai !== null;
  }

  /**
   * Transcribe Minnan audio
   * @param audioData Audio data as Buffer or File
   * @returns Transcribed text
   */
  async transcribe(audioData: Buffer): Promise<string> {
    if (!this.openai) {
      throw new Error("OpenAI API key not configured");
    }

    // Create a temporary file from buffer
    const file = new File([new Uint8Array(audioData)], "audio.wav", { type: "audio/wav" });

    const response = await this.openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "nan", // Minnan language code
      response_format: "text",
    });

    return response;
  }

  /**
   * Transcribe with language auto-detection
   * Falls back to auto-detection if Minnan fails
   */
  async transcribeWithFallback(audioData: Buffer): Promise<{ text: string; language: string }> {
    try {
      // Try Minnan first
      const text = await this.transcribe(audioData);
      return { text, language: "nan" };
    } catch (error) {
      // Fall back to auto-detection
      if (!this.openai) {
        throw new Error("OpenAI API key not configured");
      }

      const file = new File([new Uint8Array(audioData)], "audio.wav", { type: "audio/wav" });
      const response = await this.openai.audio.transcriptions.create({
        file,
        model: "whisper-1",
        response_format: "text",
      });

      return { text: response, language: "auto" };
    }
  }
}
