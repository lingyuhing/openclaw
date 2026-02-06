import type { VoiceprintId, SpeakerRegistryEntry, SpeakerAlias } from "./types.js";

/**
 * SpeakerRegistry manages speaker identity persistence and aliases
 *
 * This is an in-memory registry. For production use, this should be backed by
 * a persistent store like SQLite or Redis.
 */
export class SpeakerRegistry {
  private speakers: Map<VoiceprintId, SpeakerRegistryEntry> = new Map();
  private aliases: Map<VoiceprintId, SpeakerAlias> = new Map();

  /**
   * Register or update a speaker
   */
  registerSpeaker(
    voiceprintId: VoiceprintId,
    duration: number,
    featuresHash: string,
  ): SpeakerRegistryEntry {
    const now = Date.now();
    const existing = this.speakers.get(voiceprintId);

    if (existing) {
      // Update existing entry
      existing.lastDetectedAt = now;
      existing.occurrenceCount += 1;
      existing.totalDuration += duration;
      return existing;
    }

    // Create new entry
    const entry: SpeakerRegistryEntry = {
      voiceprintId,
      firstDetectedAt: now,
      lastDetectedAt: now,
      occurrenceCount: 1,
      totalDuration: duration,
      featuresHash,
    };

    this.speakers.set(voiceprintId, entry);
    return entry;
  }

  /**
   * Get a speaker by voiceprint ID
   */
  getSpeaker(voiceprintId: VoiceprintId): SpeakerRegistryEntry | undefined {
    return this.speakers.get(voiceprintId);
  }

  /**
   * Check if a speaker is registered
   */
  hasSpeaker(voiceprintId: VoiceprintId): boolean {
    return this.speakers.has(voiceprintId);
  }

  /**
   * Set an alias for a speaker
   */
  setAlias(voiceprintId: VoiceprintId, alias: string): SpeakerAlias {
    const now = Date.now();
    const existing = this.aliases.get(voiceprintId);

    if (existing) {
      existing.alias = alias;
      existing.lastUsedAt = now;
      existing.useCount += 1;
      return existing;
    }

    const entry: SpeakerAlias = {
      voiceprintId,
      alias,
      createdAt: now,
      lastUsedAt: now,
      useCount: 1,
    };

    this.aliases.set(voiceprintId, entry);
    return entry;
  }

  /**
   * Get alias for a speaker
   */
  getAlias(voiceprintId: VoiceprintId): SpeakerAlias | undefined {
    return this.aliases.get(voiceprintId);
  }

  /**
   * Get display name for a speaker (alias if set, otherwise voiceprint ID)
   */
  getDisplayName(voiceprintId: VoiceprintId, includeShortId = true): string {
    const alias = this.aliases.get(voiceprintId);
    if (alias) {
      return alias.alias;
    }

    if (includeShortId) {
      const shortId = voiceprintId.slice(4, 12);
      return `Speaker (${shortId}...)`;
    }

    return `Speaker`;
  }

  /**
   * Get all registered speakers
   */
  getAllSpeakers(): SpeakerRegistryEntry[] {
    return Array.from(this.speakers.values());
  }

  /**
   * Get all aliases
   */
  getAllAliases(): SpeakerAlias[] {
    return Array.from(this.aliases.values());
  }

  /**
   * Search speakers by alias (partial match)
   */
  searchByAlias(query: string): Array<{ entry: SpeakerRegistryEntry; alias: SpeakerAlias }> {
    const results: Array<{ entry: SpeakerRegistryEntry; alias: SpeakerAlias }> = [];
    const lowerQuery = query.toLowerCase();

    for (const [voiceprintId, alias] of this.aliases) {
      if (alias.alias.toLowerCase().includes(lowerQuery)) {
        const entry = this.speakers.get(voiceprintId);
        if (entry) {
          results.push({ entry, alias });
        }
      }
    }

    return results;
  }

  /**
   * Clear all speakers and aliases
   */
  clear(): void {
    this.speakers.clear();
    this.aliases.clear();
  }

  /**
   * Get statistics about the registry
   */
  getStats(): {
    totalSpeakers: number;
    totalAliases: number;
    totalOccurrences: number;
    totalDuration: number;
  } {
    let totalOccurrences = 0;
    let totalDuration = 0;

    for (const entry of this.speakers.values()) {
      totalOccurrences += entry.occurrenceCount;
      totalDuration += entry.totalDuration;
    }

    return {
      totalSpeakers: this.speakers.size,
      totalAliases: this.aliases.size,
      totalOccurrences,
      totalDuration,
    };
  }
}

/**
 * Create a singleton instance of the speaker registry
 */
export const speakerRegistry = new SpeakerRegistry();
