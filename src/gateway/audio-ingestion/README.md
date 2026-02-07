# Audio Ingestion System

Audio Ingestion 系统用于接收来自 Android 节点的音频流，进行组装、验证，并路由到 Media Understanding 系统进行语音转文字。

## 快速开始

```typescript
import { GatewayAudioIngestion } from "./index.js";

const audioIngestion = new GatewayAudioIngestion(config, logger);

// 附加到 WebSocket 连接
audioIngestion.attachHandler({
  ws: webSocket,
  connId: "conn-123",
  nodeId: "node-456",
  config,
  log: logger,
});
```

## 核心组件

- **AudioStreamHandler** - 处理音频流生命周期管理
- **AudioAssembler** - 组装音频块，支持乱序处理
- **AudioValidator** - 验证音频格式和质量
- **AudioStorage** - 临时文件存储和管理
- **StreamMonitor** - 监控流健康状态

## WebSocket 协议

### 开始音频流

```json
{
  "type": "audio.stream.start",
  "payload": {
    "sessionKey": "session-123",
    "format": "opus",
    "sampleRate": 16000,
    "channels": 1
  }
}
```

### 发送音频数据

```json
{
  "type": "audio.stream.chunk",
  "payload": {
    "streamId": "stream-123",
    "sequence": 0,
    "data": "base64encodedaudio...",
    "isLast": false
  }
}
```

### 转录结果

```json
{
  "type": "audio.transcription",
  "payload": {
    "streamId": "stream-123",
    "text": "Hello, world!",
    "confidence": 0.95,
    "isFinal": true
  }
}
```

## 配置

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

## 测试

```bash
# 运行所有测试
npx vitest run src/gateway/audio-ingestion/

# 运行特定测试
npx vitest run src/gateway/audio-ingestion/assembler.test.ts
```

## 实现详情

详细实现文档：[IMPLEMENTATION.md](./IMPLEMENTATION.md)

C4 架构设计：[docs/c4/planning/android-node-voice-upgrade-c4.md](../../../../../docs/c4/planning/android-node-voice-upgrade-c4.md)
