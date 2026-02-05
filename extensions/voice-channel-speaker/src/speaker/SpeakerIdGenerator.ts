/**
 * Speaker ID Generator
 * Generates unique and consistent IDs based on voiceprint features
 */

import { createHash } from "crypto";

export class SpeakerIdGenerator {
  /**
   * Generate unique ID based on voiceprint embedding vector
   * Ensures same voiceprint features always generate same ID
   */
  static generate(embedding: number[], gender?: "M" | "F" | "U"): string {
    // 1. Normalize feature vector
    const normalized = this.normalize(embedding);

    // 2. Take first 64 dimensions for hash calculation
    const featureBytes = this.toBytes(normalized.slice(0, 64));

    // 3. Calculate SHA-256 hash
    const hash = createHash("sha256").update(featureBytes).digest("hex");

    // 4. Take first 6 characters as short hash
    const shortHash = hash.substring(0, 6);

    // 5. Generate complete ID
    const genderCode = gender || "U";
    return `spk_${shortHash}_${genderCode}`;
  }

  /**
   * Normalize feature vector
   */
  private static normalize(embedding: number[]): number[] {
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map((val) => val / magnitude);
  }

  /**
   * Convert float array to byte array
   */
  private static toBytes(floats: number[]): Buffer {
    const buffer = Buffer.alloc(floats.length * 4);
    floats.forEach((val, i) => {
      buffer.writeFloatLE(val, i * 4);
    });
    return buffer;
  }

  /**
   * Generate unknown speaker ID
   */
  static generateUnknown(): string {
    const timestamp = Date.now().toString(36);
    return `spk_unknown_${timestamp}`;
  }

  /**
   * Check if ID is valid speaker ID
   */
  static isValid(id: string): boolean {
    return id.startsWith("spk_") && !id.startsWith("spk_unknown_");
  }

  /**
   * Extract hash from speaker ID
   */
  static extractHash(id: string): string | null {
    const match = id.match(/^spk_([a-f0-9]{6})_[MFU]$/);
    return match?.[1] || null;
  }

  /**
   * Extract gender from speaker ID
   */
  static extractGender(id: string): "M" | "F" | "U" | null {
    const match = id.match(/^spk_[a-f0-9]{6}_([MFU])$/);
    const code = match?.[1];
    if (code === "M" || code === "F" || code === "U") {
      return code;
    }
    return null;
  }
}
