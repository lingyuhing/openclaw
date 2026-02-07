/**
 * Audio Validator
 *
 * Validates audio format, quality, and integrity.
 * Supports multiple audio formats: Opus, PCM, WAV, AAC
 */

import type { AssembledAudio, AudioFormat, AudioValidationResult } from "./types.js";

export interface ValidatorConfig {
  maxDuration?: number; // ms, default 5 minutes
  minDuration?: number; // ms, default 100ms
  maxFileSize?: number; // bytes, default 100MB
  minFileSize?: number; // bytes, default 100 bytes
  allowedFormats?: AudioFormat[];
  validateHeader?: boolean; // default true
  checkAudioQuality?: boolean; // default true
}

// Audio format signatures for header validation
const AUDIO_SIGNATURES: Record<AudioFormat, number[]> = {
  opus: [0x4f, 0x70, 0x75, 0x73], // "Opus"
  pcm: [], // PCM has no standard header
  wav: [0x52, 0x49, 0x46, 0x46], // "RIFF"
  aac: [], // AAC is usually in ADTS format
};

// ADTS sync word for AAC: 0xFFF
const AAC_ADTS_SYNC = 0xfff0;

export class AudioValidator {
  private config: Required<ValidatorConfig>;

  constructor(config: ValidatorConfig = {}) {
    this.config = {
      maxDuration: config.maxDuration ?? 5 * 60 * 1000, // 5 minutes
      minDuration: config.minDuration ?? 100, // 100ms
      maxFileSize: config.maxFileSize ?? 100 * 1024 * 1024, // 100MB
      minFileSize: config.minFileSize ?? 100, // 100 bytes
      allowedFormats: config.allowedFormats ?? ["opus", "pcm", "wav", "aac"],
      validateHeader: config.validateHeader ?? true,
      checkAudioQuality: config.checkAudioQuality ?? true,
    };
  }

  /**
   * Validate assembled audio
   */
  async validate(audio: AssembledAudio): Promise<AudioValidationResult> {
    const errors: string[] = [];

    // Check file size
    if (audio.totalBytes > this.config.maxFileSize) {
      errors.push(`File size ${audio.totalBytes} exceeds maximum ${this.config.maxFileSize}`);
    }
    if (audio.totalBytes < this.config.minFileSize) {
      errors.push(`File size ${audio.totalBytes} is below minimum ${this.config.minFileSize}`);
    }

    // Check duration if available
    if (audio.duration !== undefined) {
      if (audio.duration > this.config.maxDuration) {
        errors.push(`Duration ${audio.duration}ms exceeds maximum ${this.config.maxDuration}ms`);
      }
      if (audio.duration < this.config.minDuration) {
        errors.push(`Duration ${audio.duration}ms is below minimum ${this.config.minDuration}ms`);
      }
    }

    // Check format is allowed
    if (!this.config.allowedFormats.includes(audio.config.format)) {
      errors.push(
        `Format ${audio.config.format} is not in allowed formats: ${this.config.allowedFormats.join(", ")}`,
      );
    }

    // Validate header if enabled
    if (this.config.validateHeader) {
      const headerValid = this.validateHeader(audio.data, audio.config.format);
      if (!headerValid) {
        errors.push(`Invalid ${audio.config.format} header`);
      }
    }

    // Check audio quality if enabled
    if (this.config.checkAudioQuality) {
      const qualityIssues = this.checkAudioQuality(audio);
      errors.push(...qualityIssues);
    }

    return {
      valid: errors.length === 0,
      format: audio.config.format,
      sampleRate: audio.config.sampleRate,
      channels: audio.config.channels,
      duration: audio.duration,
      errors,
    };
  }

  /**
   * Validate audio header based on format
   */
  private validateHeader(data: Buffer, format: string): boolean {
    if (data.length < 4) {
      return false;
    }

    switch (format) {
      case "wav": {
        // WAV starts with "RIFF" and has "WAVE" at position 8
        if (data.toString("ascii", 0, 4) !== "RIFF") {
          return false;
        }
        if (data.length >= 12 && data.toString("ascii", 8, 12) !== "WAVE") {
          return false;
        }
        return true;
      }

      case "opus": {
        // Opus in Ogg container starts with "OggS"
        if (data.toString("ascii", 0, 4) === "OggS") {
          return true;
        }
        // Raw Opus starts with "Opus"
        if (data.toString("ascii", 0, 4) === "Opus") {
          return true;
        }
        return false;
      }

      case "aac": {
        // AAC in ADTS format starts with 0xFFF (12 sync bits)
        const syncWord = (data[0] << 8) | data[1];
        if ((syncWord & 0xfff0) === AAC_ADTS_SYNC) {
          return true;
        }
        // AAC in ADIF format starts with "ADIF"
        if (data.toString("ascii", 0, 4) === "ADIF") {
          return true;
        }
        return false;
      }

      case "pcm": {
        // PCM has no standard header, but we can check if the data is not empty
        return data.length > 0;
      }

      default:
        return false;
    }
  }

  /**
   * Check audio quality issues
   */
  private checkAudioQuality(audio: AssembledAudio): string[] {
    const issues: string[] = [];

    // Check for silence (very small file)
    if (audio.totalBytes < 1000) {
      issues.push("Audio may be silent or very short");
    }

    // Check for reasonable duration
    if (audio.duration !== undefined) {
      if (audio.duration < 500) {
        issues.push("Audio duration is very short (< 500ms)");
      }
      if (audio.duration > 60000) {
        issues.push("Audio duration is very long (> 60s)");
      }
    }

    // Check sample rate validity
    const validSampleRates = [8000, 16000, 22050, 24000, 44100, 48000];
    if (!validSampleRates.includes(audio.config.sampleRate)) {
      issues.push(`Unusual sample rate: ${audio.config.sampleRate}`);
    }

    // Check channels
    if (audio.config.channels < 1 || audio.config.channels > 2) {
      issues.push(`Unusual channel count: ${audio.config.channels}`);
    }

    return issues;
  }

  /**
   * Get validation configuration
   */
  getConfig(): Required<ValidatorConfig> {
    return { ...this.config };
  }

  /**
   * Update validation configuration
   */
  updateConfig(config: Partial<ValidatorConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }
}
