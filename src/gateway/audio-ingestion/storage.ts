/**
 * Audio Storage
 *
 * Temporary storage for audio files before processing.
 * Handles file I/O and cleanup.
 */

import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, unlink, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { AssembledAudio, AudioFormat } from "./types.js";

export interface StorageConfig {
  basePath: string;
  ttl?: number; // Time to live in ms, default 1 hour
  cleanupInterval?: number; // Cleanup interval in ms, default 10 minutes
  maxFileSize?: number; // Maximum file size in bytes, default 100MB
}

export interface StoredAudio {
  streamId: string;
  filePath: string;
  format: AudioFormat;
  size: number;
  createdAt: number;
  expiresAt: number;
}

export class AudioStorage {
  private config: Required<StorageConfig>;
  private storedFiles = new Map<string, StoredAudio>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: StorageConfig) {
    this.config = {
      basePath: config.basePath,
      ttl: config.ttl ?? 60 * 60 * 1000,
      cleanupInterval: config.cleanupInterval ?? 10 * 60 * 1000,
      maxFileSize: config.maxFileSize ?? 100 * 1024 * 1024,
    };

    // Start cleanup timer
    this.startCleanupTimer();
  }

  /**
   * Save assembled audio to temporary storage
   */
  async save(audio: AssembledAudio): Promise<string> {
    // Check file size
    if (audio.totalBytes > this.config.maxFileSize) {
      throw new Error(`File size ${audio.totalBytes} exceeds maximum ${this.config.maxFileSize}`);
    }

    // Generate file path
    const fileName = `${audio.streamId}.${this.getFileExtension(audio.config.format)}`;
    const filePath = join(this.config.basePath, fileName);

    // Ensure directory exists
    await mkdir(dirname(filePath), { recursive: true });

    // Write file
    await writeFile(filePath, audio.data);

    // Track stored file
    const now = Date.now();
    const stored: StoredAudio = {
      streamId: audio.streamId,
      filePath,
      format: audio.config.format,
      size: audio.totalBytes,
      createdAt: now,
      expiresAt: now + this.config.ttl,
    };

    this.storedFiles.set(audio.streamId, stored);

    return filePath;
  }

  /**
   * Load audio data from storage
   */
  async load(streamId: string): Promise<Buffer | null> {
    const stored = this.storedFiles.get(streamId);
    if (!stored) {
      return null;
    }

    try {
      const data = await readFile(stored.filePath);
      return data;
    } catch (error) {
      // File may have been deleted
      this.storedFiles.delete(streamId);
      return null;
    }
  }

  /**
   * Check if a stream exists in storage
   */
  async exists(streamId: string): Promise<boolean> {
    const stored = this.storedFiles.get(streamId);
    if (!stored) {
      return false;
    }

    try {
      await access(stored.filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete a stored audio file
   */
  async delete(streamId: string): Promise<boolean> {
    const stored = this.storedFiles.get(streamId);
    if (!stored) {
      return false;
    }

    try {
      await unlink(stored.filePath);
    } catch {
      // File may already be deleted
    }

    this.storedFiles.delete(streamId);
    return true;
  }

  /**
   * Get stored audio metadata
   */
  getStoredAudio(streamId: string): StoredAudio | undefined {
    return this.storedFiles.get(streamId);
  }

  /**
   * Get all stored audio files
   */
  getAllStored(): StoredAudio[] {
    return Array.from(this.storedFiles.values());
  }

  /**
   * Clean up expired files
   */
  async cleanup(): Promise<number> {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [streamId, stored] of this.storedFiles) {
      if (stored.expiresAt < now) {
        toDelete.push(streamId);
      }
    }

    for (const streamId of toDelete) {
      await this.delete(streamId);
    }

    return toDelete.length;
  }

  /**
   * Dispose of all resources
   */
  async dispose(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Delete all stored files
    const streamIds = Array.from(this.storedFiles.keys());
    for (const streamId of streamIds) {
      await this.delete(streamId);
    }
  }

  /**
   * Start the cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      void this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Get file extension for audio format
   */
  private getFileExtension(format: AudioFormat): string {
    switch (format) {
      case "opus":
        return "opus";
      case "pcm":
        return "pcm";
      case "wav":
        return "wav";
      case "aac":
        return "aac";
      default:
        return "bin";
    }
  }
}
