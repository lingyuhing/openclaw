# Speaker Diarization Implementation Summary

## Overview

This implementation adds comprehensive Speaker Diarization functionality to OpenClaw's media understanding module, following the C4 architecture documented in `docs/c4/planning/`.

## What is Speaker Diarization?

Speaker diarization is the process of identifying "who spoke when" in an audio recording. It separates audio into segments according to speaker identity, enabling:

- Multi-speaker conversation transcription
- Meeting notes with speaker attribution
- Interview transcription with speaker labels
- Podcast transcription with host/guest identification

## Implementation Components

### 1. Core Types (`types.ts`)

Defines all type definitions for the diarization system:

- `SpeakerSegment`: Individual speaker utterance with timing
- `VoiceprintId`: Unique identifier for speakers (format: `vpr_<32-char-hash>`)
- `SpeakerMapping`: Links STT speaker IDs to voiceprint IDs
- `DiarizationConfig`: Configuration options
- `DiarizationResult`: Complete diarization output

### 2. Voiceprint ID Generator (`voiceprint-id-generator.ts`)

Generates deterministic, unique voiceprint IDs using SHA-256 hashing:

**Key Features:**

- **Deterministic**: Same speaker always gets same ID across different runs
- **Unique**: Different speakers always get different IDs
- **Cross-platform**: Consistent results across different environments
- **Configurable**: Supports different hash algorithms and truncation lengths

**Algorithm:**

1. Extract features from speaker segments (timing, text patterns)
2. Apply L2 normalization to feature vector
3. Serialize to binary format
4. Compute SHA-256 hash
5. Truncate and add "vpr\_" prefix

### 3. Diarization Engine (`diarization-engine.ts`)

Core processing engine that orchestrates the diarization workflow:

**Responsibilities:**

- Parse STT provider responses
- Extract speaker segments with timing
- Generate voiceprint IDs for each speaker
- Format output with speaker labels
- Validate speaker counts against configuration

**Usage:**

```typescript
const engine = createDiarizationEngine({
  enabled: true,
  provider: "deepgram",
  speakerCountMin: 1,
  speakerCountMax: 6,
});

const result = engine.processResponse(sttResponse);
```

### 4. Transcript Formatter (`transcript-formatter.ts`)

Formats diarization results into human-readable output:

**Features:**

- Speaker label formatting (customizable format strings)
- Timestamp inclusion (optional)
- Utterance grouping (consecutive segments by same speaker)
- Multiple output formats (structured, simple, with metadata)

**Output Formats:**

Standard:

```
[Audio - 2 speakers detected]

Speaker 0: Hello everyone
Speaker 1: Hi there
Speaker 0: How are you?
```

With timestamps:

```
[00:00] Speaker 0: Hello everyone
[00:02] Speaker 1: Hi there
[00:04] Speaker 0: How are you?
```

### 5. Speaker Registry (`speaker-registry.ts`)

Manages speaker identity persistence and aliases:

**Features:**

- Speaker registration with metadata
- Alias management (human-readable names)
- Speaker lookup and search
- Usage statistics
- Persistence-ready interface

**Use Cases:**

- Remember speaker identities across sessions
- Assign human-readable names to speakers
- Track speaker statistics (total duration, occurrences)
- Search speakers by alias

### 6. STT Provider Parsers (`parsers/`)

Parse diarization responses from different STT providers:

#### Deepgram Parser (`deepgram-parser.ts`)

- Parses Deepgram Nova-2 diarization responses
- Extracts speaker segments with word-level timing
- Supports utterance segmentation
- Handles confidence scores

#### Google Parser (`google-parser.ts`)

- Parses Google Cloud STT diarization responses
- Extracts speaker segments with speaker tags
- Supports word time offsets
- Handles multi-channel audio

## Integration with OpenClaw

### Configuration

Add to your OpenClaw configuration:

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

### Usage Flow

1. **Audio Input**: User sends voice message
2. **STT Processing**: Deepgram/Google transcribes with diarization
3. **Diarization Engine**: Parses response, generates voiceprint IDs
4. **Transcript Formatter**: Creates structured output with speaker labels
5. **Agent Processing**: LLM processes transcript with speaker context
6. **Response**: Agent responds with awareness of conversation participants

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

## Performance Considerations

- **Voiceprint ID Generation**: O(n) where n is number of segments per speaker
- **Diarization Engine**: O(n) for parsing and processing
- **Memory Usage**: Proportional to number of speakers and segments
- **Deterministic**: Same audio always produces same voiceprint IDs

## Future Enhancements

- [ ] Real-time diarization for streaming audio
- [ ] Cross-session speaker identification
- [ ] Speaker enrollment and verification
- [ ] Advanced voiceprint features (x-vectors, d-vectors)
- [ ] Persistent speaker database with search
- [ ] Multi-language speaker diarization
- [ ] Confidence scoring and quality metrics

## References

- C4 Architecture: `docs/c4/planning/speaker-diarization-c4.md`
- Audio Processing Flow: `docs/c4/planning/audio-processing-flow.md`
- Deepgram Diarization: https://developers.deepgram.com/docs/diarization
- Google Cloud STT Diarization: https://cloud.google.com/speech-to-text/docs/multiple-voices

## License

Part of the OpenClaw project.
