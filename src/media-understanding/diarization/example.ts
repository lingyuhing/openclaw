/**
 * Example usage of Speaker Diarization feature
 *
 * This example demonstrates how to use the diarization module
 * to process audio with speaker separation.
 */

import type { SpeakerSegment, STTDiarizationResponse } from "./types.js";
import {
  createDiarizationEngine,
  generateVoiceprintId,
  parseDeepgramDiarizationResponse,
  formatDiarizationOutput,
  speakerRegistry,
  isValidVoiceprintId,
} from "./index.js";

// Example 1: Basic voiceprint ID generation
function example1_VoiceprintGeneration() {
  console.log("=== Example 1: Voiceprint ID Generation ===\n");

  const segments: SpeakerSegment[] = [
    {
      speakerId: 0,
      startTime: 0,
      endTime: 2.5,
      text: "Hello everyone, welcome to the meeting.",
      confidence: 0.95,
    },
    {
      speakerId: 0,
      startTime: 3,
      endTime: 5,
      text: "Today we'll discuss the project roadmap.",
      confidence: 0.92,
    },
  ];

  const voiceprintId = generateVoiceprintId(segments, 0);

  console.log("Generated Voiceprint ID:", voiceprintId);
  console.log("Is valid:", isValidVoiceprintId(voiceprintId));
  console.log("Short ID:", voiceprintId.slice(4, 12) + "...");
}

// Example 2: Processing Deepgram diarization response
function example2_DiarizationEngine() {
  console.log("\n=== Example 2: Diarization Engine ===\n");

  // Simulated Deepgram response with diarization
  const mockDeepgramResponse: STTDiarizationResponse = {
    provider: "deepgram",
    model: "nova-2",
    raw: {},
    segments: [
      {
        speakerId: 0,
        startTime: 0,
        endTime: 2,
        text: "Hello, this is Alice.",
        confidence: 0.96,
      },
      {
        speakerId: 1,
        startTime: 2.5,
        endTime: 4,
        text: "Hi Alice, I'm Bob.",
        confidence: 0.94,
      },
      {
        speakerId: 0,
        startTime: 4.5,
        endTime: 6,
        text: "Nice to meet you, Bob.",
        confidence: 0.95,
      },
    ],
  };

  // Create diarization engine
  const engine = createDiarizationEngine({
    enabled: true,
    provider: "deepgram",
    speakerCountMin: 1,
    speakerCountMax: 6,
    speakerLabelFormat: "Speaker {id}",
  });

  // Process the response
  const result = engine.processResponse(mockDeepgramResponse);

  console.log("Success:", result.success);
  console.log("Speaker count:", result.speakerCount);
  console.log("Segments count:", result.segments.length);
  console.log("\nFormatted Output:");
  console.log(formatDiarizationOutput(result));

  // Register speakers in registry
  if (result.success) {
    for (const mapping of result.speakerMappings) {
      speakerRegistry.registerSpeaker(
        mapping.voiceprintId,
        mapping.totalDuration,
        mapping.voiceprintId.slice(4), // Use voiceprint ID as features hash
      );
    }

    console.log("\nRegistered speakers:", speakerRegistry.getAllSpeakers().length);
  }
}

// Example 3: Working with speaker registry
function example3_SpeakerRegistry() {
  console.log("\n=== Example 3: Speaker Registry ===\n");

  // Clear any existing data
  speakerRegistry.clear();

  // Register some speakers
  const voiceprintId1 = "vpr_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6" as const;
  const voiceprintId2 = "vpr_b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7" as const;

  speakerRegistry.registerSpeaker(voiceprintId1, 10.5, "hash1");
  speakerRegistry.registerSpeaker(voiceprintId1, 5.2, "hash1"); // Update existing
  speakerRegistry.registerSpeaker(voiceprintId2, 8.0, "hash2");

  // Set aliases
  speakerRegistry.setAlias(voiceprintId1, "Alice");
  speakerRegistry.setAlias(voiceprintId2, "Bob");

  // Query speakers
  console.log("Total speakers:", speakerRegistry.getAllSpeakers().length);
  console.log("Total aliases:", speakerRegistry.getAllAliases().length);

  const speaker1 = speakerRegistry.getSpeaker(voiceprintId1);
  console.log("\nSpeaker 1 (Alice):");
  console.log("  Total duration:", speaker1?.totalDuration, "seconds");
  console.log("  Occurrence count:", speaker1?.occurrenceCount);

  const displayName1 = speakerRegistry.getDisplayName(voiceprintId1);
  const displayName2 = speakerRegistry.getDisplayName(voiceprintId2);
  console.log("\nDisplay names:");
  console.log("  Speaker 1:", displayName1);
  console.log("  Speaker 2:", displayName2);

  // Search by alias
  const searchResults = speakerRegistry.searchByAlias("Ali");
  console.log("\nSearch for 'Ali':", searchResults.length, "result(s)");

  // Get stats
  const stats = speakerRegistry.getStats();
  console.log("\nRegistry stats:");
  console.log("  Total speakers:", stats.totalSpeakers);
  console.log("  Total aliases:", stats.totalAliases);
  console.log("  Total occurrences:", stats.totalOccurrences);
  console.log("  Total duration:", stats.totalDuration, "seconds");
}

// Run all examples
console.log("Speaker Diarization Examples");
console.log("============================\n");

example1_VoiceprintGeneration();
example2_DiarizationEngine();
example3_SpeakerRegistry();

console.log("\n============================");
console.log("All examples completed!");
