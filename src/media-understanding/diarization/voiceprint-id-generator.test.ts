import { describe, it, expect } from "vitest";
import type { SpeakerSegment } from "./types.js";
import {
  generateVoiceprintId,
  isValidVoiceprintId,
  extractVoiceprintHash,
} from "./voiceprint-id-generator.js";

describe("VoiceprintIdGenerator", () => {
  describe("generateVoiceprintId", () => {
    it("should generate a valid voiceprint ID for single speaker", () => {
      const segments: SpeakerSegment[] = [
        {
          speakerId: 0,
          startTime: 0,
          endTime: 2.5,
          text: "Hello world",
          confidence: 0.95,
        },
        {
          speakerId: 0,
          startTime: 3,
          endTime: 5,
          text: "How are you?",
          confidence: 0.92,
        },
      ];

      const id = generateVoiceprintId(segments, 0);

      expect(isValidVoiceprintId(id)).toBe(true);
      expect(id).toMatch(/^vpr_[a-f0-9]{32}$/);
    });

    it("should generate different IDs for different speakers", () => {
      const segments: SpeakerSegment[] = [
        {
          speakerId: 0,
          startTime: 0,
          endTime: 2,
          text: "Hello from speaker 0",
          confidence: 0.95,
        },
        {
          speakerId: 1,
          startTime: 2.5,
          endTime: 4,
          text: "Hello from speaker 1",
          confidence: 0.92,
        },
      ];

      const id0 = generateVoiceprintId(segments, 0);
      const id1 = generateVoiceprintId(segments, 1);

      expect(id0).not.toBe(id1);
      expect(isValidVoiceprintId(id0)).toBe(true);
      expect(isValidVoiceprintId(id1)).toBe(true);
    });

    it("should generate deterministic IDs for same speaker", () => {
      const segments: SpeakerSegment[] = [
        {
          speakerId: 0,
          startTime: 0,
          endTime: 2.5,
          text: "Hello world",
          confidence: 0.95,
        },
      ];

      const id1 = generateVoiceprintId(segments, 0);
      const id2 = generateVoiceprintId(segments, 0);

      expect(id1).toBe(id2);
    });

    it("should generate fallback ID for empty segments", () => {
      const segments: SpeakerSegment[] = [];

      const id = generateVoiceprintId(segments, 0);

      expect(isValidVoiceprintId(id)).toBe(true);
    });

    it("should respect custom config for hash truncation", () => {
      const segments: SpeakerSegment[] = [
        {
          speakerId: 0,
          startTime: 0,
          endTime: 2,
          text: "Test",
          confidence: 0.9,
        },
      ];

      const id = generateVoiceprintId(segments, 0, {
        hashTruncation: 16,
        outputFormat: "vpr_{hash}",
      });

      expect(id.length).toBe(4 + 16); // "vpr_" + 16 chars
    });
  });

  describe("isValidVoiceprintId", () => {
    it("should return true for valid voiceprint ID", () => {
      expect(isValidVoiceprintId("vpr_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6")).toBe(true);
    });

    it("should return false for invalid IDs", () => {
      expect(isValidVoiceprintId("invalid")).toBe(false);
      expect(isValidVoiceprintId("vpr_123")).toBe(false);
      expect(isValidVoiceprintId("vpr_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8")).toBe(false);
      expect(isValidVoiceprintId("")).toBe(false);
    });
  });

  describe("extractVoiceprintHash", () => {
    it("should extract hash from voiceprint ID", () => {
      const id = "vpr_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6" as const;
      const hash = extractVoiceprintHash(id);
      expect(hash).toBe("a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6");
    });
  });
});
