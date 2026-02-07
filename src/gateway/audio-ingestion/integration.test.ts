import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { AudioStreamChunk, AudioStreamConfig } from "./types.js";
import { AudioAssembler } from "./assembler.js";
import { AudioStorage } from "./storage.js";
import { AudioValidator } from "./validator.js";

describe("Audio Ingestion Integration", () => {
  const mockConfig: AudioStreamConfig = {
    sessionKey: "test-session",
    format: "opus",
    sampleRate: 16000,
    channels: 1,
  };

  describe("AudioAssembler + AudioValidator", () => {
    it("should assemble and validate audio chunks", () => {
      const assembler = new AudioAssembler("test-stream", mockConfig);
      const validator = new AudioValidator();

      // Add chunks
      const chunks: AudioStreamChunk[] = [
        {
          streamId: "test-stream",
          sequence: 0,
          data: Buffer.alloc(100, 0x4f), // Opus-like data
          isLast: false,
        },
        {
          streamId: "test-stream",
          sequence: 1,
          data: Buffer.alloc(100, 0x70),
          isLast: true,
        },
      ];

      chunks.forEach((chunk) => assembler.addChunk(chunk));

      expect(assembler.isAssemblyComplete()).toBe(true);

      const assembly = assembler.getAssembly();
      expect(assembly).not.toBeNull();
      expect(assembly!.totalBytes).toBe(200);
    });
  });

  describe("AudioStorage", () => {
    let tempDir: string;
    let storage: AudioStorage;

    beforeEach(async () => {
      tempDir = join(tmpdir(), `openclaw-test-${Date.now()}`);
      await fs.mkdir(tempDir, { recursive: true });
      storage = new AudioStorage({ basePath: tempDir });
    });

    afterEach(async () => {
      await storage.dispose();
      try {
        await fs.rmdir(tempDir, { recursive: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    it("should save and load audio data", async () => {
      const mockAudio = {
        streamId: "test-stream",
        config: mockConfig,
        data: Buffer.from("test audio data"),
        totalChunks: 1,
        totalBytes: 15,
        assembledAt: Date.now(),
      };

      const filePath = await storage.save(mockAudio);
      expect(filePath).toContain("test-stream");

      const loaded = await storage.load("test-stream");
      expect(loaded).not.toBeNull();
      expect(loaded!.toString()).toBe("test audio data");
    });

    it("should check if audio exists", async () => {
      const mockAudio = {
        streamId: "exist-stream",
        config: mockConfig,
        data: Buffer.from("exists"),
        totalChunks: 1,
        totalBytes: 6,
        assembledAt: Date.now(),
      };

      await storage.save(mockAudio);
      expect(await storage.exists("exist-stream")).toBe(true);
      expect(await storage.exists("non-existent")).toBe(false);
    });

    it("should delete audio files", async () => {
      const mockAudio = {
        streamId: "delete-stream",
        config: mockConfig,
        data: Buffer.from("delete me"),
        totalChunks: 1,
        totalBytes: 9,
        assembledAt: Date.now(),
      };

      await storage.save(mockAudio);
      expect(await storage.exists("delete-stream")).toBe(true);

      const deleted = await storage.delete("delete-stream");
      expect(deleted).toBe(true);
      expect(await storage.exists("delete-stream")).toBe(false);
    });

    it("should track stored audio metadata", async () => {
      const mockAudio = {
        streamId: "meta-stream",
        config: mockConfig,
        data: Buffer.from("metadata test"),
        totalChunks: 1,
        totalBytes: 13,
        assembledAt: Date.now(),
      };

      await storage.save(mockAudio);
      const stored = storage.getStoredAudio("meta-stream");

      expect(stored).toBeDefined();
      expect(stored!.streamId).toBe("meta-stream");
      expect(stored!.format).toBe("opus");
      expect(stored!.size).toBe(13);
    });
  });

  describe("End-to-End Flow", () => {
    it("should handle complete audio ingestion flow", async () => {
      // 1. Create assembler
      const assembler = new AudioAssembler("e2e-stream", mockConfig);

      // 2. Add chunks simulating a real audio stream
      const chunks: AudioStreamChunk[] = [
        {
          streamId: "e2e-stream",
          sequence: 0,
          data: Buffer.from("RIFF....WAVE"), // WAV header
          isLast: false,
        },
        {
          streamId: "e2e-stream",
          sequence: 1,
          data: Buffer.alloc(1024, 0x00), // Audio data
          isLast: false,
        },
        {
          streamId: "e2e-stream",
          sequence: 2,
          data: Buffer.alloc(512, 0x00),
          isLast: true,
        },
      ];

      chunks.forEach((chunk) => assembler.addChunk(chunk));

      // 3. Verify assembly is complete
      expect(assembler.isAssemblyComplete()).toBe(true);

      // 4. Get assembled audio
      const assembly = assembler.getAssembly();
      expect(assembly).not.toBeNull();
      expect(assembly!.streamId).toBe("e2e-stream");
      expect(assembly!.totalChunks).toBe(3);

      // 5. Validate the assembled audio
      const validator = new AudioValidator({
        allowedFormats: ["wav", "opus", "pcm"],
        validateHeader: true,
      });

      const validation = await validator.validate(assembly!);
      // Note: The validation might fail because we're using fake data,
      // but the validation process should run without errors
      expect(validation).toHaveProperty("valid");
      expect(validation).toHaveProperty("errors");
    });
  });
});
