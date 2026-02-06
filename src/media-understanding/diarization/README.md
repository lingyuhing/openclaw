# Speaker Diarization Module

This module provides speaker diarization functionality for audio transcription in OpenClaw, following the C4 architecture documented in `docs/c4/planning/`.

## Overview

Speaker diarization is the process of identifying "who spoke when" in an audio recording. This module:

- Extracts speaker segments from STT provider responses (Deepgram, Google Cloud)
- Generates deterministic voiceprint IDs using SHA-256 hashing
- Formats transcripts with speaker labels
- Manages speaker identity persistence

## Quick Start

```typescript
import {
  createDiarizationEngine,
  parseDeepgramDiarizationResponse,
  formatDiarizationOutput,
} from "./diarization";

// Create a diarization engine
const engine = createDiarizationEngine({
  enabled: true,
  provider: "deepgram",
  speakerCountMin: 1,
  speakerCountMax: 6,
  speakerLabelFormat: "Speaker {id}",
});

// Parse STT response
const sttResponse = parseDeepgramDiarizationResponse(rawDeepgramResponse, "nova-2");

// Process diarization
const result = engine.processResponse(sttResponse);

// Format output
console.log(formatDiarizationOutput(result));
```

## Core Components

### 1. Voiceprint ID Generator

Generates deterministic, unique IDs for speakers using SHA-256 hashing of audio features.

```typescript
import { generateVoiceprintId } from "./diarization";

const voiceprintId = generateVoiceprintId(segments, speakerId);
// Returns: "vpr_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"
```

**Key Features:**

- Deterministic: Same speaker always gets same ID
- Unique: Different speakers always get different IDs
- Cross-platform: Consistent across different environments

### 2. Diarization Engine

Core engine that processes STT responses and generates structured diarization results.

```typescript
import { createDiarizationEngine } from "./diarization";

const engine = createDiarizationEngine({
  enabled: true,
  provider: "deepgram", // or "google"
  model: "nova-2",
  speakerCountMin: 1,
  speakerCountMax: 10,
  speakerLabelFormat: "Speaker {id}", // or "Person {letter}", etc.
  utterances: true,
  forceVoiceprintIdForAllSpeakers: true,
});

const result = engine.processResponse(sttResponse);
```

### 3. Transcript Formatter

Formats diarization results into human-readable output.

```typescript
import { formatDiarizationOutput, formatTranscript } from "./diarization";

// Full formatted output with metadata
const formatted = formatDiarizationOutput(result);

// Custom formatting
const transcript = formatTranscript(segments, mappings, {
  speakerLabelFormat: "Person {id}",
  includeTimestamps: true,
  timestampFormat: "[MM:SS]",
});
```

### 4. Speaker Registry

Manages speaker identity persistence and aliases.

```typescript
import { speakerRegistry } from "./diarization";

// Register a speaker
speakerRegistry.registerSpeaker(voiceprintId, totalDuration, featuresHash);

// Set alias
speakerRegistry.setAlias(voiceprintId, "Alice");

// Get display name
const name = speakerRegistry.getDisplayName(voiceprintId);

// Search by alias
const results = speakerRegistry.searchByAlias("Ali");
```

## Configuration

### Media Tools Configuration

Add diarization configuration to your OpenClaw config:

```yaml
tools:
  media:
    audio:
      enabled: true
      diarization: true
      diarizationOptions:
        provider: deepgram
        model: nova-2
        speakerCountMin: 1
        speakerCountMax: 6
        speakerLabelFormat: "Speaker {id}"
        utterances: true
        forceVoiceprintIdForAllSpeakers: true
```

### Provider-Specific Configuration

#### Deepgram

```yaml
diarizationOptions:
  provider: deepgram
  model: nova-2
  diarizationVersion: "2021-07-14.0"
  smartFormat: true
  punctuate: true
  utterances: true
```

#### Google Cloud

```yaml
diarizationOptions:
  provider: google
  model: latest_long
  enableSpeakerDiarization: true
  diarizationSpeakerCountMin: 2
  diarizationSpeakerCountMax: 6
  enableWordTimeOffsets: true
```

## Output Format

### Standard Output

```
[Audio - 2 speakers detected]

# Speaker 0 (ID: a1b2c3d4...): 3 segments, ~8s
# Speaker 1 (ID: b2c3d4e5...): 2 segments, ~5s

Speaker 0: Hello everyone, welcome to the meeting.
Speaker 1: Hi Alice, thanks for having me.
Speaker 0: Let's get started with the agenda.
```

### With Timestamps

```
[00:00] Speaker 0: Hello everyone
[00:02] Speaker 1: Hi there
[00:04] Speaker 0: How are you?
```

## Architecture

The diarization module follows the C4 architecture documented in `docs/c4/planning/`:

1. **Voiceprint ID Generator**: Creates deterministic, unique IDs for speakers
2. **Diarization Engine**: Core processing engine for STT responses
3. **Transcript Formatter**: Formats output with speaker labels
4. **Speaker Registry**: Manages speaker identity persistence

## Testing

Run the test suite:

```bash
# Run all diarization tests
npx vitest run src/media-understanding/diarization/

# Run with coverage
npx vitest run src/media-understanding/diarization/ --coverage

# Run specific test file
npx vitest run src/media-understanding/diarization/voiceprint-id-generator.test.ts
```

## License

Part of the OpenClaw project.
