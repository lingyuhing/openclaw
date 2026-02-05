# Android 语音消息通道 API 接口文档

## 概述

本文档定义了 OpenClaw Android Voice Channel 的所有 API 接口，包括 Gateway Extension 接口和 Android 端内部接口。

**版本**: 1.0.0  
**最后更新**: 2026-02-05  
**作者**: OpenClaw Team

---

## 目录

1. [Gateway Extension 接口](#gateway-extension-接口)
2. [Android 端接口](#android-端接口)
3. [数据模型](#数据模型)
4. [错误处理](#错误处理)

---

## Gateway Extension 接口

### 1. 声纹识别接口

#### 1.1 speaker.enroll - 注册声纹

**描述**: 注册新说话人的声纹特征

**请求参数**:

```typescript
{
  audioData: string;    // Base64 编码的音频数据（WAV 格式，16kHz，16-bit）
  gender?: 'M' | 'F' | 'U';  // 可选性别提示：男/女/未知
}
```

**响应结果**:

```typescript
{
  speakerId: string; // 生成的声纹 ID，格式：spk_{hash}_{gender}
  hash: string; // 声纹特征哈希（前6位十六进制）
  confidence: number; // 注册质量置信度（0-1）
}
```

**错误码**:

- `ENROLL_FAILED`: 注册失败
- `INVALID_AUDIO`: 音频格式无效
- `INSUFFICIENT_AUDIO`: 音频时长不足（最少3秒）

**示例**:

```json
// 请求
{
  "audioData": "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA...",
  "gender": "M"
}

// 响应
{
  "speakerId": "spk_a3f7b2_M",
  "hash": "a3f7b2",
  "confidence": 0.92
}
```

---

#### 1.2 speaker.identify - 识别声纹

**描述**: 从音频中识别说话人

**请求参数**:

```typescript
{
  audioData: string;    // Base64 编码的音频数据
  threshold?: number;   // 识别阈值（默认 0.8，范围 0-1）
}
```

**响应结果**:

```typescript
{
  speakerId: string; // 识别的声纹 ID
  confidence: number; // 置信度（0-1）
  isKnown: boolean; // 是否为已知说话人
}
```

**错误码**:

- `IDENTIFY_FAILED`: 识别失败
- `INVALID_AUDIO`: 音频格式无效
- `NO_ENROLLED_SPEAKERS`: 没有已注册的声纹

**示例**:

```json
// 请求
{
  "audioData": "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA...",
  "threshold": 0.85
}

// 响应 - 已知说话人
{
  "speakerId": "spk_a3f7b2_M",
  "confidence": 0.91,
  "isKnown": true
}

// 响应 - 未知说话人
{
  "speakerId": "spk_unknown_abc123",
  "confidence": 0.45,
  "isKnown": false
}
```

---

#### 1.3 speaker.list - 获取声纹列表

**描述**: 获取所有已注册的声纹列表

**请求参数**: 无

**响应结果**:

```typescript
{
  speakers: Array<{
    id: string; // 声纹 ID
    hash: string; // 特征哈希
    gender?: "M" | "F" | "U"; // 性别
    createdAt: number; // 创建时间戳（毫秒）
    updatedAt: number; // 更新时间戳（毫秒）
  }>;
  totalCount: number; // 总数
}
```

**错误码**:

- `LIST_FAILED`: 获取列表失败

**示例**:

```json
// 响应
{
  "speakers": [
    {
      "id": "spk_a3f7b2_M",
      "hash": "a3f7b2",
      "gender": "M",
      "createdAt": 1707000000000,
      "updatedAt": 1707000000000
    },
    {
      "id": "spk_9e2d1c_F",
      "hash": "9e2d1c",
      "gender": "F",
      "createdAt": 1706900000000,
      "updatedAt": 1706900000000
    }
  ],
  "totalCount": 2
}
```

---

#### 1.4 speaker.delete - 删除声纹

**描述**: 删除指定的声纹

**请求参数**:

```typescript
{
  speakerId: string; // 要删除的声纹 ID
}
```

**响应结果**:

```typescript
{
  success: boolean; // 是否删除成功
}
```

**错误码**:

- `DELETE_FAILED`: 删除失败
- `SPEAKER_NOT_FOUND`: 声纹不存在

**示例**:

```json
// 请求
{
  "speakerId": "spk_a3f7b2_M"
}

// 响应
{
  "success": true
}
```

---

### 2. 语音识别（STT）接口

#### 2.1 stt.setLanguage - 设置识别语言

**描述**: 设置语音识别的目标语言

**请求参数**:

```typescript
{
  language: "zh" | "nan" | "auto"; // zh=普通话, nan=闽南语, auto=自动检测
}
```

**响应结果**:

```typescript
{
  success: boolean; // 是否设置成功
}
```

**错误码**:

- `INVALID_LANGUAGE`: 无效的语言代码
- `SET_LANGUAGE_FAILED`: 设置失败

**示例**:

```json
// 请求
{
  "language": "nan"
}

// 响应
{
  "success": true
}
```

---

#### 2.2 stt.getLanguage - 获取当前语言

**描述**: 获取当前设置的识别语言

**请求参数**: 无

**响应结果**:

```typescript
{
  language: "zh" | "nan" | "auto";
}
```

**示例**:

```json
// 响应
{
  "language": "nan"
}
```

---

#### 2.3 stt.transcribe - 语音转文字

**描述**: 将音频转换为文字

**请求参数**:

```typescript
{
  audioData: string;                    // Base64 编码的音频数据
  language?: 'zh' | 'nan' | 'auto';     // 可选，覆盖当前设置
}
```

**响应结果**:

```typescript
{
  text: string; // 识别结果
  language: string; // 实际使用的语言
}
```

**错误码**:

- `TRANSCRIBE_FAILED`: 识别失败
- `NOT_CONFIGURED`: STT 服务未配置（缺少 API Key）
- `INVALID_AUDIO`: 音频格式无效

**示例**:

```json
// 请求
{
  "audioData": "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA...",
  "language": "nan"
}

// 响应
{
  "text": "今天天氣真好",
  "language": "nan"
}
```

---

### 3. Gateway 事件推送

#### 3.1 speaker.identified - 声纹识别结果事件

**描述**: 实时推送声纹识别结果

**事件数据**:

```typescript
{
  speakerId: string; // 识别的声纹 ID
  confidence: number; // 置信度
  timestamp: number; // 时间戳
}
```

**示例**:

```json
{
  "event": "speaker.identified",
  "payload": {
    "speakerId": "spk_a3f7b2_M",
    "confidence": 0.91,
    "timestamp": 1707000000000
  }
}
```

---

#### 3.2 stt.languageChanged - 语言切换事件

**描述**: 语言设置变更通知

**事件数据**:

```typescript
{
  language: "zh" | "nan" | "auto";
  timestamp: number;
}
```

**示例**:

```json
{
  "event": "stt.languageChanged",
  "payload": {
    "language": "nan",
    "timestamp": 1707000000000
  }
}
```

---

## Android 端接口

### 1. SpeakerRecognitionManager

**包路径**: `ai.openclaw.android.speaker.SpeakerRecognitionManager`

#### 1.1 enroll - 注册声纹

```kotlin
suspend fun enroll(
    audioData: ByteArray,
    gender: String? = null
): Result<SpeakerId>
```

**参数**:

- `audioData`: 音频数据字节数组（WAV 格式）
- `gender`: 可选性别提示（"M"/"F"/"U"）

**返回**:

- `Result.success(SpeakerId)`: 注册成功，返回声纹 ID
- `Result.failure(Exception)`: 注册失败

---

#### 1.2 identify - 识别声纹

```kotlin
suspend fun identify(
    audioData: ByteArray,
    threshold: Float = 0.8f
): Result<SpeakerRecognitionResult>
```

**参数**:

- `audioData`: 音频数据字节数组
- `threshold`: 识别阈值（默认 0.8）

**返回**:

- `Result.success(SpeakerRecognitionResult)`: 识别结果
- `Result.failure(Exception)`: 识别失败

---

#### 1.3 loadSpeakers - 加载声纹列表

```kotlin
suspend fun loadSpeakers(): Result<List<SpeakerProfile>>
```

**返回**:

- `Result.success(List<SpeakerProfile>)`: 声纹列表
- `Result.failure(Exception)`: 加载失败

---

#### 1.4 deleteSpeaker - 删除声纹

```kotlin
suspend fun deleteSpeaker(speakerId: String): Result<Boolean>
```

**参数**:

- `speakerId`: 要删除的声纹 ID

**返回**:

- `Result.success(Boolean)`: 是否删除成功
- `Result.failure(Exception)`: 删除失败

---

#### 1.5 getSpeakerDisplayName - 获取显示名称

```kotlin
fun getSpeakerDisplayName(speakerId: String): String
```

**参数**:

- `speakerId`: 声纹 ID

**返回**: 用户友好的显示名称

---

### 2. SttLanguageManager

**包路径**: `ai.openclaw.android.stt.SttLanguageManager`

#### 2.1 setLanguage - 设置语言

```kotlin
fun setLanguage(language: SttLanguage)
```

**参数**:

- `language`: 语言枚举（ZH/NAN/AUTO）

---

#### 2.2 getCurrentLanguage - 获取当前语言

```kotlin
fun getCurrentLanguage(): SttLanguage
```

**返回**: 当前设置的语言

---

## 数据模型

### 1. SpeakerId（声纹 ID）

```kotlin
data class SpeakerId(
    val id: String,              // 完整 ID，如 "spk_a3f7b2_M"
    val hash: String,            // 声纹特征哈希
    val gender: String?,         // M/F/U
    val registeredAt: Long       // 注册时间戳
)
```

**ID 格式规则**:

- 格式: `spk_{6位哈希}_{性别}`
- 示例: `spk_a3f7b2_M`, `spk_9e2d1c_F`, `spk_8b5e1d_U`
- 未知说话人: `spk_unknown_{时间戳}`

---

### 2. SpeakerProfile（声纹档案）

```kotlin
@Entity(tableName = "speaker_profiles")
data class SpeakerProfile(
    @PrimaryKey
    val id: String,              // 声纹 ID
    val hash: String,            // 哈希值
    val gender: String?,         // 性别
    val confidence: Float,       // 注册时的置信度
    val registeredAt: Long,      // 注册时间
    val lastIdentifiedAt: Long?  // 最后识别时间
)
```

---

### 3. SpeakerRecognitionResult（识别结果）

```kotlin
data class SpeakerRecognitionResult(
    val speakerId: String,       // 识别的声纹 ID
    val confidence: Float,       // 置信度（0-1）
    val isKnown: Boolean         // 是否已知说话人
)
```

---

### 4. SttLanguage（语言设置）

```kotlin
enum class SttLanguage(val code: String) {
    ZH("zh"),           // 普通话
    NAN("nan"),         // 闽南语
    AUTO("auto");       // 自动检测
}
```

---

## 错误处理

### 错误响应格式

所有接口的错误响应遵循以下格式：

```typescript
{
  ok: false;
  error: {
    code: string; // 错误码
    message: string; // 错误描述
  }
}
```

### 错误码列表

| 错误码                 | 描述           | 适用接口                                         |
| ---------------------- | -------------- | ------------------------------------------------ |
| `ENROLL_FAILED`        | 声纹注册失败   | speaker.enroll                                   |
| `IDENTIFY_FAILED`      | 声纹识别失败   | speaker.identify                                 |
| `LIST_FAILED`          | 获取列表失败   | speaker.list                                     |
| `DELETE_FAILED`        | 删除失败       | speaker.delete                                   |
| `SPEAKER_NOT_FOUND`    | 声纹不存在     | speaker.delete                                   |
| `INVALID_AUDIO`        | 音频格式无效   | speaker.enroll, speaker.identify, stt.transcribe |
| `INSUFFICIENT_AUDIO`   | 音频时长不足   | speaker.enroll                                   |
| `NO_ENROLLED_SPEAKERS` | 没有已注册声纹 | speaker.identify                                 |
| `INVALID_LANGUAGE`     | 无效的语言代码 | stt.setLanguage                                  |
| `SET_LANGUAGE_FAILED`  | 设置语言失败   | stt.setLanguage                                  |
| `TRANSCRIBE_FAILED`    | 语音识别失败   | stt.transcribe                                   |
| `NOT_CONFIGURED`       | 服务未配置     | stt.transcribe                                   |

### 降级策略

| 场景                   | 处理策略                                 |
| ---------------------- | ---------------------------------------- |
| 声纹识别失败           | 返回 `spk_unknown_{timestamp}`，继续对话 |
| Gateway 声纹服务不可用 | 使用默认 ID `spk_default`，不中断对话    |
| 闽南语 STT 失败        | 自动回退到普通话识别                     |
| 网络断开               | 本地缓存已注册声纹 ID，恢复后同步        |
| 声纹匹配置信度低       | 提示用户重新注册或标记为未知             |

---

## 附录

### A. 音频格式要求

- **格式**: WAV (PCM)
- **采样率**: 16000 Hz
- **位深度**: 16-bit
- **声道**: 单声道（Mono）
- **时长**: 注册时最少 3 秒，建议 5-10 秒

### B. 声纹 ID 生成算法

```typescript
// 1. 提取声纹特征向量（128-512 维）
const embedding = extractEmbedding(audioData);

// 2. 归一化
const normalized = normalize(embedding);

// 3. 取前 64 维计算 SHA-256 哈希
const hash = sha256(normalized.slice(0, 64));

// 4. 取前 6 位作为短哈希
const shortHash = hash.substring(0, 6);

// 5. 生成 ID
const speakerId = `spk_${shortHash}_${gender || "U"}`;
```

### C. 变更日志

| 版本  | 日期       | 变更内容 |
| ----- | ---------- | -------- |
| 1.0.0 | 2026-02-05 | 初始版本 |

---

**文档维护**: OpenClaw Team  
**反馈渠道**: https://github.com/openclaw/openclaw/issues
