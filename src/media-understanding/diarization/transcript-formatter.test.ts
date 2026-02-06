import { describe, it, expect } from "vitest";
import type { SpeakerSegment, SpeakerMapping, DiarizationResult } from "./types.js";
import {
  formatTranscript,
  formatDiarizationOutput,
  createSimpleTranscript,
} from "./transcript-formatter.js";

describe("TranscriptFormatter", () => {
  describe("formatTranscript", () => {
    it("should format transcript with speaker labels", () => {
      const segments: SpeakerSegment[] = [
        {
          speakerId: 0,
          startTime: 0,
          endTime: 2,
          text: "Hello everyone",
          confidence: 0.95,
        },
        {
          speakerId: 1,
          startTime: 2.5,
          endTime: 4,
          text: "Hi there",
          confidence: 0.92,
        },
        {
          speakerId: 0,
          startTime: 4.5,
          endTime: 6,
          text: "How are you?",
          confidence: 0.9,
        },
      ];

      const mappings: SpeakerMapping[] = [
        {
          sttSpeakerId: 0,
          voiceprintId: "vpr_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
          displayLabel: "Speaker 0",
          totalDuration: 3.5,
          segmentCount: 2,
        },
        {
          sttSpeakerId: 1,
          voiceprintId: "vpr_b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7",
          displayLabel: "Speaker 1",
          totalDuration: 1.5,
          segmentCount: 1,
        },
      ];

      const result = formatTranscript(segments, mappings);

      expect(result).toContain("Speaker 0:");
      expect(result).toContain("Hello everyone");
      expect(result).toContain("How are you?");
      expect(result).toContain("Speaker 1:");
      expect(result).toContain("Hi there");
    });

    it("should include timestamps when configured", () => {
      const segments: SpeakerSegment[] = [
        {
          speakerId: 0,
          startTime: 0,
          endTime: 2,
          text: "Hello",
          confidence: 0.95,
        },
      ];

      const mappings: SpeakerMapping[] = [
        {
          sttSpeakerId: 0,
          voiceprintId: "vpr_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
          displayLabel: "Speaker 0",
          totalDuration: 2,
          segmentCount: 1,
        },
      ];

      const result = formatTranscript(segments, mappings, {
        includeTimestamps: true,
      });

      expect(result).toContain("[00:00]");
    });

    it("should return empty string for empty segments", () => {
      const result = formatTranscript([], []);
      expect(result).toBe("");
    });
  });

  describe("formatDiarizationOutput", () => {
    it("should format successful diarization result", () => {
      const result: DiarizationResult = {
        success: true,
        segments: [
          {
            speakerId: 0,
            startTime: 0,
            endTime: 2,
            text: "Hello",
            confidence: 0.95,
          },
          {
            speakerId: 1,
            startTime: 2.5,
            endTime: 4,
            text: "Hi there",
            confidence: 0.92,
          },
        ],
        speakerMappings: [
          {
            sttSpeakerId: 0,
            voiceprintId: "vpr_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
            displayLabel: "Speaker 0",
            totalDuration: 2,
            segmentCount: 1,
          },
          {
            sttSpeakerId: 1,
            voiceprintId: "vpr_b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7",
            displayLabel: "Speaker 1",
            totalDuration: 1.5,
            segmentCount: 1,
          },
        ],
        speakerCount: 2,
        fullTranscript: "Hello Hi there",
        formattedOutput: "Speaker 0: Hello\nSpeaker 1: Hi there",
      };

      const output = formatDiarizationOutput(result);

      expect(output).toContain("[Audio - 2 speakers detected]");
      expect(output).toContain("Speaker 0:");
      expect(output).toContain("Speaker 1:");
      expect(output).toContain("Hello");
      expect(output).toContain("Hi there");
    });

    it("should format failed diarization result", () => {
      const result: DiarizationResult = {
        success: false,
        error: "Diarization failed",
        segments: [],
        speakerMappings: [],
        speakerCount: 0,
        fullTranscript: "",
        formattedOutput: "",
      };

      const output = formatDiarizationOutput(result);

      expect(output).toContain("Audio transcription failed");
      expect(output).toContain("Diarization failed");
    });
  });

  describe("createSimpleTranscript", () => {
    it("should create simple transcript format", () => {
      const segments: SpeakerSegment[] = [
        {
          speakerId: 0,
          startTime: 0,
          endTime: 2,
          text: "Hello",
          confidence: 0.95,
        },
        {
          speakerId: 1,
          startTime: 2.5,
          endTime: 4,
          text: "Hi there",
          confidence: 0.92,
        },
      ];

      const mappings: SpeakerMapping[] = [
        {
          sttSpeakerId: 0,
          voiceprintId: "vpr_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
          displayLabel: "Speaker 0",
          totalDuration: 2,
          segmentCount: 1,
        },
        {
          sttSpeakerId: 1,
          voiceprintId: "vpr_b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7",
          displayLabel: "Speaker 1",
          totalDuration: 1.5,
          segmentCount: 1,
        },
      ];

      const result = createSimpleTranscript(segments, mappings);

      expect(result).toContain("Speaker 0");
      expect(result).toContain("Hello");
      expect(result).toContain("Speaker 1");
      expect(result).toContain("Hi there");
    });

    it("should return empty string for empty segments", () => {
      const result = createSimpleTranscript([], []);
      expect(result).toBe("");
    });
  });
});
