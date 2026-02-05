/**
 * Speaker Repository
 * Manages speaker embeddings storage and retrieval
 */

import { existsSync } from "fs";
import { readFile, writeFile, mkdir, readdir, unlink } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import type { SpeakerEmbedding, SpeakerInfo, SpeakerListResponse } from "../types/speaker.types.js";

const STORAGE_DIR = join(homedir(), ".openclaw", "speaker-recognition");
const EMBEDDINGS_DIR = join(STORAGE_DIR, "embeddings");
const INDEX_FILE = join(STORAGE_DIR, "index.json");

interface SpeakerIndex {
  version: string;
  speakers: SpeakerInfo[];
  totalCount: number;
}

export class SpeakerRepository {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Create directories
    await mkdir(EMBEDDINGS_DIR, { recursive: true });

    // Create index file if not exists
    if (!existsSync(INDEX_FILE)) {
      const initialIndex: SpeakerIndex = {
        version: "1.0",
        speakers: [],
        totalCount: 0,
      };
      await writeFile(INDEX_FILE, JSON.stringify(initialIndex, null, 2));
    }

    this.initialized = true;
  }

  /**
   * Save speaker embedding
   */
  async save(embedding: SpeakerEmbedding): Promise<void> {
    await this.initialize();

    // Save embedding file
    const embeddingFile = join(EMBEDDINGS_DIR, `${embedding.id}.json`);
    await writeFile(embeddingFile, JSON.stringify(embedding, null, 2));

    // Update index
    const index = await this.readIndex();
    const existingIndex = index.speakers.findIndex((s) => s.id === embedding.id);

    const speakerInfo: SpeakerInfo = {
      id: embedding.id,
      hash: embedding.hash,
      gender: embedding.gender,
      createdAt: embedding.createdAt,
      updatedAt: embedding.updatedAt,
    };

    if (existingIndex >= 0) {
      index.speakers[existingIndex] = speakerInfo;
    } else {
      index.speakers.push(speakerInfo);
      index.totalCount = index.speakers.length;
    }

    await writeFile(INDEX_FILE, JSON.stringify(index, null, 2));
  }

  /**
   * Get speaker embedding by ID
   */
  async get(id: string): Promise<SpeakerEmbedding | null> {
    await this.initialize();

    try {
      const embeddingFile = join(EMBEDDINGS_DIR, `${id}.json`);
      const data = await readFile(embeddingFile, "utf-8");
      return JSON.parse(data) as SpeakerEmbedding;
    } catch {
      return null;
    }
  }

  /**
   * List all speakers
   */
  async list(): Promise<SpeakerListResponse> {
    await this.initialize();

    const index = await this.readIndex();
    return {
      speakers: index.speakers,
      totalCount: index.totalCount,
    };
  }

  /**
   * Delete speaker by ID
   */
  async delete(id: string): Promise<boolean> {
    await this.initialize();

    try {
      // Delete embedding file
      const embeddingFile = join(EMBEDDINGS_DIR, `${id}.json`);
      if (existsSync(embeddingFile)) {
        await unlink(embeddingFile);
      }

      // Update index
      const index = await this.readIndex();
      index.speakers = index.speakers.filter((s) => s.id !== id);
      index.totalCount = index.speakers.length;
      await writeFile(INDEX_FILE, JSON.stringify(index, null, 2));

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all embeddings for matching
   */
  async getAllEmbeddings(): Promise<SpeakerEmbedding[]> {
    await this.initialize();

    const index = await this.readIndex();
    const embeddings: SpeakerEmbedding[] = [];

    for (const speaker of index.speakers) {
      const embedding = await this.get(speaker.id);
      if (embedding) {
        embeddings.push(embedding);
      }
    }

    return embeddings;
  }

  /**
   * Check if speaker exists
   */
  async exists(id: string): Promise<boolean> {
    await this.initialize();

    const index = await this.readIndex();
    return index.speakers.some((s) => s.id === id);
  }

  private async readIndex(): Promise<SpeakerIndex> {
    try {
      const data = await readFile(INDEX_FILE, "utf-8");
      return JSON.parse(data) as SpeakerIndex;
    } catch {
      return { version: "1.0", speakers: [], totalCount: 0 };
    }
  }
}
