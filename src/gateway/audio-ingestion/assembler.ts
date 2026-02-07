/**
 * Audio Assembler
 *
 * Assembles audio chunks in the correct order and handles
 * out-of-order chunks using sequence numbers.
 */

import type { AudioStreamConfig, AudioStreamChunk, AssembledAudio } from "./types.js";

export interface AssemblerConfig {
  maxOutOfOrderChunks?: number; // Maximum number of out-of-order chunks to buffer
  assemblyTimeout?: number; // Timeout for assembly in ms
  allowGaps?: boolean; // Whether to allow gaps in the sequence
}

export class AudioAssembler {
  private streamId: string;
  private audioConfig: AudioStreamConfig;
  private chunks = new Map<number, AudioStreamChunk>();
  private receivedSequences = new Set<number>();
  private nextExpectedSequence = 0;
  private isComplete = false;
  private startedAt: number;
  private config: Required<AssemblerConfig>;

  // Statistics
  private totalChunksReceived = 0;
  private outOfOrderChunks = 0;
  private duplicateChunks = 0;

  constructor(streamId: string, audioConfig: AudioStreamConfig, config: AssemblerConfig = {}) {
    this.streamId = streamId;
    this.audioConfig = audioConfig;
    this.startedAt = Date.now();
    this.config = {
      maxOutOfOrderChunks: config.maxOutOfOrderChunks ?? 100,
      assemblyTimeout: config.assemblyTimeout ?? 30000,
      allowGaps: config.allowGaps ?? false,
    };
  }

  /**
   * Add a chunk to the assembler
   */
  addChunk(chunk: AudioStreamChunk): boolean {
    if (this.isComplete) {
      return false;
    }

    const { sequence } = chunk;

    // Check for duplicates
    if (this.receivedSequences.has(sequence)) {
      this.duplicateChunks++;
      return false;
    }

    // Track statistics
    this.totalChunksReceived++;

    // Check if this is an out-of-order chunk
    if (sequence !== this.nextExpectedSequence) {
      // Check if we've exceeded the out-of-order buffer limit
      if (this.chunks.size >= this.config.maxOutOfOrderChunks) {
        // Remove oldest out-of-order chunk to make room
        const oldestSequence = Math.min(...this.chunks.keys());
        this.chunks.delete(oldestSequence);
      }
      this.outOfOrderChunks++;
    }

    // Store the chunk
    this.chunks.set(sequence, chunk);
    this.receivedSequences.add(sequence);

    // Update next expected sequence if this was the expected one
    if (sequence === this.nextExpectedSequence) {
      this.advanceNextExpected();
    }

    // Check if this is the last chunk
    if (chunk.isLast) {
      this.checkCompletion();
    } else {
      // Check if we now have a complete sequence after filling a gap
      // This handles the case where a non-last chunk arrives out of order
      const hasLastChunk = Array.from(this.chunks.values()).some((c) => c.isLast);
      if (hasLastChunk && sequence < this.nextExpectedSequence) {
        this.checkCompletion();
      }
    }

    return true;
  }

  /**
   * Advance the next expected sequence number past any consecutive chunks we have
   */
  private advanceNextExpected(): void {
    while (this.chunks.has(this.nextExpectedSequence)) {
      this.nextExpectedSequence++;
    }
  }

  /**
   * Check if the stream is complete (all chunks received)
   */
  private checkCompletion(): void {
    // Find the last chunk (isLast = true)
    let lastChunk: AudioStreamChunk | undefined;
    for (const chunk of this.chunks.values()) {
      if (chunk.isLast) {
        lastChunk = chunk;
        break;
      }
    }

    if (!lastChunk) {
      return;
    }

    // Check if we have all chunks from 0 to lastChunk.sequence
    const expectedCount = lastChunk.sequence + 1;
    if (this.chunks.size === expectedCount) {
      this.isComplete = true;
    }
  }

  /**
   * Get the assembled audio if complete
   */
  getAssembly(): AssembledAudio | null {
    if (!this.isComplete) {
      return null;
    }

    // Sort chunks by sequence
    const sortedChunks = Array.from(this.chunks.values()).toSorted(
      (a, b) => a.sequence - b.sequence,
    );

    // Concatenate all chunk data
    const chunks = sortedChunks.map((chunk) => chunk.data);
    const totalLength = chunks.reduce((sum, buf) => sum + buf.length, 0);
    const assembledData = Buffer.concat(chunks, totalLength);

    // Calculate duration (estimate based on data size and format)
    const duration = this.estimateDuration(assembledData.length);

    return {
      streamId: this.streamId,
      config: this.audioConfig,
      data: assembledData,
      totalChunks: sortedChunks.length,
      totalBytes: assembledData.length,
      duration,
      assembledAt: Date.now(),
    };
  }

  /**
   * Estimate audio duration based on format and data size
   */
  private estimateDuration(dataLength: number): number {
    const { format, sampleRate, channels } = this.audioConfig;
    let bytesPerSecond: number;

    switch (format) {
      case "pcm":
      case "wav":
        // PCM: sampleRate * channels * 2 bytes (16-bit)
        bytesPerSecond = sampleRate * channels * 2;
        break;
      case "opus":
        // Opus: typical bitrate 24kbps = 3KB/s
        bytesPerSecond = 3000;
        break;
      case "aac":
        // AAC: typical bitrate 128kbps = 16KB/s
        bytesPerSecond = 16000;
        break;
      default:
        bytesPerSecond = 16000; // Default estimate
    }

    return Math.round((dataLength / bytesPerSecond) * 1000); // Duration in ms
  }

  /**
   * Check if the assembly is complete
   */
  isAssemblyComplete(): boolean {
    return this.isComplete;
  }

  /**
   * Get assembly statistics
   */
  getStats(): {
    totalChunks: number;
    outOfOrderChunks: number;
    duplicateChunks: number;
    bufferedChunks: number;
    nextExpectedSequence: number;
    isComplete: boolean;
    elapsedMs: number;
  } {
    return {
      totalChunks: this.totalChunksReceived,
      outOfOrderChunks: this.outOfOrderChunks,
      duplicateChunks: this.duplicateChunks,
      bufferedChunks: this.chunks.size,
      nextExpectedSequence: this.nextExpectedSequence,
      isComplete: this.isComplete,
      elapsedMs: Date.now() - this.startedAt,
    };
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.chunks.clear();
    this.receivedSequences.clear();
    this.isComplete = true;
  }
}
