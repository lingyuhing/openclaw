# Audio Ingestion Implementation Summary

## Overview

This implementation adds an Audio Ingestion system to the OpenClaw Gateway that handles audio streams from Android nodes. The system receives audio data via WebSocket, assembles the chunks, validates the audio, and routes it to the Media Understanding system for transcription.

## Architecture

The implementation follows the C4 model design documented in `/workspaces/openclaw/docs/c4/planning/android-node-voice-upgrade-c4.md`.

### Core Components

1. **AudioStreamHandler** (`stream-handler.ts`)
   - Main orchestrator for audio stream processing
   - Manages stream lifecycle: start → chunks → end → transcription
   - Handles error recovery and cleanup

2. **AudioAssembler** (`assembler.ts`)
   - Assembles audio chunks in correct order
   - Handles out-of-order chunks using sequence numbers
   - Supports configurable buffering limits

3. **AudioValidator** (`validator.ts`)
   - Validates audio format, quality, and integrity
   - Supports multiple formats: Opus, PCM, WAV, AAC
   - Performs header validation for each format

4. **AudioStorage** (`storage.ts`)
   - Temporary file storage for assembled audio
   - Automatic cleanup of expired files
   - Configurable TTL and storage limits

5. **StreamMonitor** (`monitor.ts`)
   - Monitors stream health and performance
   - Detects stalled streams
   - Reports detailed metrics

### Integration Components

1. **WsAudioStreamHandler** (`ws-handler.ts`)
   - WebSocket integration for audio streams
   - Handles WebSocket message protocol
   - Manages WebSocket lifecycle

2. **MediaUnderstandingRunner** (`media-integration.ts`)
   - Integrates with existing Media Understanding system
   - Routes audio to STT providers
   - Processes transcription results

3. **GatewayAudioIngestion** (`gateway-integration.ts`)
   - Main entry point for Gateway integration
   - Attaches handlers to WebSocket connections
   - Manages handler lifecycle

## WebSocket Protocol

### Message Types

#### Client → Gateway

1. **audio.stream.start** - Start a new audio stream

```typescript
{
  type: "audio.stream.start";
  payload: {
    sessionKey: string;
    format: "opus" | "pcm" | "wav";
    sampleRate: number;
    channels: number;
    language?: string;
    diarization?: boolean;
  };
}
```

2. **audio.stream.chunk** - Send audio data chunk

```typescript
{
  type: "audio.stream.chunk";
  payload: {
    streamId: string;
    sequence: number;
    data: string; // Base64 encoded
    isLast: boolean;
  }
}
```

3. **audio.stream.end** - Signal end of stream

```typescript
{
  type: "audio.stream.end";
  payload: {
    streamId: string;
    totalChunks: number;
    totalBytes: number;
  }
}
```

#### Gateway → Client

1. **audio.stream.ack** - Acknowledge chunk receipt

```typescript
{
  type: "audio.stream.ack";
  payload: {
    streamId: string;
    receivedChunks: number;
    status: "receiving" | "processing" | "completed";
    progress?: number;
  };
}
```

2. **audio.transcription** - Transcription result

```typescript
{
  type: "audio.transcription";
  payload: {
    streamId: string;
    text: string;
    confidence?: number;
    isFinal: boolean;
    speakers?: SpeakerInfo[];
  };
}
```

3. **audio.stream.error** - Error message

```typescript
{
  type: "audio.stream.error";
  payload: {
    streamId: string;
    code: AudioStreamErrorCode;
    message: string;
    recoverable: boolean;
  }
}
```

## Configuration

Add to your `openclaw.config.yaml`:

```yaml
gateway:
  audioIngestion:
    enabled: true
    maxConcurrentStreams: 10
    maxStreamSize: 104857600 # 100MB
    maxDuration: 300000 # 5 minutes
    tempStoragePath: "/tmp/openclaw-audio"
    enableTranscription: true
```

## Testing

Run the test suite:

```bash
# Run all audio ingestion tests
npx vitest run src/gateway/audio-ingestion/

# Run specific test file
npx vitest run src/gateway/audio-ingestion/assembler.test.ts

# Run with coverage
npx vitest run src/gateway/audio-ingestion/ --coverage
```

## Usage Example

```typescript
import { GatewayAudioIngestion } from "./gateway/audio-ingestion/index.js";

// Initialize
const audioIngestion = new GatewayAudioIngestion(config, logger);

// Attach to WebSocket
audioIngestion.attachHandler({
  ws: webSocket,
  upgradeReq: request,
  connId: "conn-123",
  nodeId: "node-456",
  config: openClawConfig,
  log: logger,
});

// Handle incoming messages
audioIngestion.handleMessage(connId, message);

// Cleanup
await audioIngestion.dispose();
```

## Future Enhancements

1. **Real-time Streaming STT**: Support for streaming transcription as audio arrives
2. **Noise Reduction**: Pre-process audio to remove background noise
3. **Compression**: Support for additional compressed formats
4. **Caching**: Cache transcription results for identical audio
5. **Multi-language**: Automatic language detection and multi-language support

## References

- C4 Model Design: `/workspaces/openclaw/docs/c4/planning/android-node-voice-upgrade-c4.md`
- Media Understanding: `/workspaces/openclaw/src/media-understanding/`
- WebSocket Protocol: `/workspaces/openclaw/src/gateway/protocol/`
