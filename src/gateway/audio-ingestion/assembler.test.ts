import { describe, it, expect, beforeEach } from "vitest";
import type { AudioStreamConfig, AudioStreamChunk } from "./types.js";
import { AudioAssembler } from "./assembler.js";

describe("AudioAssembler", () => {
  const mockConfig: AudioStreamConfig = {
    sessionKey: "test-session",
    format: "opus",
    sampleRate: 16000,
    channels: 1,
  };

  let assembler: AudioAssembler;

  beforeEach(() => {
    assembler = new AudioAssembler("test-stream", mockConfig);
  });

  describe("addChunk", () => {
    it("should add chunks in order", () => {
      const chunk1: AudioStreamChunk = {
        streamId: "test-stream",
        sequence: 0,
        data: Buffer.from("chunk1"),
        isLast: false,
      };

      const chunk2: AudioStreamChunk = {
        streamId: "test-stream",
        sequence: 1,
        data: Buffer.from("chunk2"),
        isLast: true,
      };

      expect(assembler.addChunk(chunk1)).toBe(true);
      expect(assembler.addChunk(chunk2)).toBe(true);
      expect(assembler.isAssemblyComplete()).toBe(true);
    });

    it("should handle out-of-order chunks", () => {
      const chunk0: AudioStreamChunk = {
        streamId: "test-stream",
        sequence: 0,
        data: Buffer.from("chunk0"),
        isLast: false,
      };

      const chunk1: AudioStreamChunk = {
        streamId: "test-stream",
        sequence: 1,
        data: Buffer.from("chunk1"),
        isLast: false,
      };

      const chunk2: AudioStreamChunk = {
        streamId: "test-stream",
        sequence: 2,
        data: Buffer.from("chunk2"),
        isLast: true,
      };

      // Add chunks out of order
      expect(assembler.addChunk(chunk1)).toBe(true);
      expect(assembler.addChunk(chunk2)).toBe(true);
      expect(assembler.isAssemblyComplete()).toBe(false);

      // Add the missing chunk
      expect(assembler.addChunk(chunk0)).toBe(true);
      expect(assembler.isAssemblyComplete()).toBe(true);
    });

    it("should reject duplicate chunks", () => {
      const chunk: AudioStreamChunk = {
        streamId: "test-stream",
        sequence: 0,
        data: Buffer.from("chunk"),
        isLast: true,
      };

      expect(assembler.addChunk(chunk)).toBe(true);
      expect(assembler.addChunk(chunk)).toBe(false); // Duplicate
    });

    it("should reject chunks after completion", () => {
      const chunk: AudioStreamChunk = {
        streamId: "test-stream",
        sequence: 0,
        data: Buffer.from("chunk"),
        isLast: true,
      };

      assembler.addChunk(chunk);
      expect(assembler.isAssemblyComplete()).toBe(true);

      const lateChunk: AudioStreamChunk = {
        streamId: "test-stream",
        sequence: 1,
        data: Buffer.from("late"),
        isLast: false,
      };

      expect(assembler.addChunk(lateChunk)).toBe(false);
    });
  });

  describe("getAssembly", () => {
    it("should return null if assembly is not complete", () => {
      expect(assembler.getAssembly()).toBeNull();
    });

    it("should return assembled audio when complete", () => {
      const chunk0: AudioStreamChunk = {
        streamId: "test-stream",
        sequence: 0,
        data: Buffer.from("Hello "),
        isLast: false,
      };

      const chunk1: AudioStreamChunk = {
        streamId: "test-stream",
        sequence: 1,
        data: Buffer.from("World!"),
        isLast: true,
      };

      assembler.addChunk(chunk0);
      assembler.addChunk(chunk1);

      const assembly = assembler.getAssembly();
      expect(assembly).not.toBeNull();
      expect(assembly!.streamId).toBe("test-stream");
      expect(assembly!.config).toEqual(mockConfig);
      expect(assembly!.data.toString()).toBe("Hello World!");
      expect(assembly!.totalChunks).toBe(2);
      expect(assembly!.totalBytes).toBe(12);
    });
  });

  describe("getStats", () => {
    it("should return initial stats", () => {
      const stats = assembler.getStats();
      expect(stats.totalChunks).toBe(0);
      expect(stats.outOfOrderChunks).toBe(0);
      expect(stats.duplicateChunks).toBe(0);
      expect(stats.bufferedChunks).toBe(0);
      expect(stats.nextExpectedSequence).toBe(0);
      expect(stats.isComplete).toBe(false);
      expect(stats.elapsedMs).toBeGreaterThanOrEqual(0);
    });

    it("should track stats correctly", () => {
      assembler.addChunk({
        streamId: "test-stream",
        sequence: 0,
        data: Buffer.from("chunk0"),
        isLast: false,
      });

      assembler.addChunk({
        streamId: "test-stream",
        sequence: 2, // Out of order
        data: Buffer.from("chunk2"),
        isLast: false,
      });

      assembler.addChunk({
        streamId: "test-stream",
        sequence: 0, // Duplicate
        data: Buffer.from("chunk0"),
        isLast: false,
      });

      const stats = assembler.getStats();
      expect(stats.totalChunks).toBe(2); // Only unique chunks counted
      expect(stats.outOfOrderChunks).toBe(1);
      expect(stats.duplicateChunks).toBe(1);
      expect(stats.bufferedChunks).toBe(2);
      expect(stats.nextExpectedSequence).toBe(1);
    });
  });
});
