# Android 语音消息通道技术设计文档

## 1. 技术栈

### 1.1 Android 端

| 组件     | 技术选型            | 说明                             |
| -------- | ------------------- | -------------------------------- |
| 开发语言 | Kotlin              | 与现有 OpenClaw Android App 一致 |
| UI 框架  | Jetpack Compose     | 现代化声明式 UI                  |
| 架构模式 | MVVM + Coroutines   | 响应式编程，生命周期感知         |
| 依赖注入 | Hilt                | Google 官方 DI 框架              |
| 本地存储 | Room                | SQLite 封装，缓存声纹 ID 列表    |
| 网络通信 | OkHttp + WebSocket  | 与 Gateway 实时通信              |
| 音频采集 | AudioRecord         | 系统 API，低延迟音频采集         |
| 权限管理 | Activity Result API | 现代权限请求方式                 |

### 1.2 Gateway 端（OpenClaw Extension）

| 组件       | 技术选型                                    | 说明                      |
| ---------- | ------------------------------------------- | ------------------------- |
| 开发语言   | TypeScript                                  | 与 OpenClaw 一致          |
| 运行时     | Node.js / Bun                               | 与 OpenClaw Gateway 一致  |
| 声纹识别   | Picovoice Eagle / Azure Speaker Recognition | 本地或云端声纹引擎        |
| 闽南语 STT | Whisper API                                 | OpenAI Whisper 支持闽南语 |
| 音频处理   | FFmpeg / Web Audio API                      | 格式转换、重采样          |
| 数据存储   | SQLite / JSON 文件                          | 声纹特征存储              |
| 协议       | WebSocket                                   | 实时双向通信              |

---

## 2. 项目结构

### 2.1 Android 端目录结构

```
apps/android/app/src/main/java/ai/openclaw/android/
├── voice/                          # 语音相关（复用现有）
│   ├── VoiceWakeManager.kt         # 语音唤醒管理
│   └── TalkModeManager.kt          # 对话模式管理
│
├── speaker/                        # 【新增】说话人识别模块
│   ├── SpeakerRecognitionManager.kt    # 声纹管理主类
│   ├── SpeakerRepository.kt            # 声纹数据仓库
│   ├── model/                          # 数据模型
│   │   ├── SpeakerId.kt                # 声纹 ID 模型
│   │   └── SpeakerProfile.kt           # 声纹档案模型
│   ├── ui/                             # UI 组件
│   │   ├── SpeakerListScreen.kt        # 声纹列表界面
│   │   └── SpeakerRegistrationDialog.kt # 声纹注册弹窗
│   └── di/                             # 依赖注入
│       └── SpeakerModule.kt
│
├── stt/                            # 【新增】语音识别扩展
│   └── LanguageSettings.kt         # 语言设置（闽南语支持）
│
└── gateway/                        # Gateway 通信（复用现有）
    └── GatewaySession.kt           # WebSocket 会话管理
```

### 2.2 Gateway Extension 目录结构

```
extensions/voice-channel-speaker/   # 【新增】声纹识别扩展
├── src/
│   ├── index.ts                    # 扩展入口
│   ├── speaker/                    # 声纹识别模块
│   │   ├── SpeakerRecognitionService.ts    # 声纹服务主类
│   │   ├── SpeakerIdGenerator.ts           # 声纹 ID 生成器
│   │   ├── SpeakerRepository.ts            # 声纹数据仓库
│   │   └── engines/                        # 声纹引擎适配器
│   │       ├── PicovoiceAdapter.ts
│   │       └── AzureAdapter.ts
│   │
│   ├── stt/                        # 闽南语 STT 模块
│   │   └── NanSttService.ts        # 闽南语识别服务
│   │
│   ├── handlers/                   # Gateway 方法处理器
│   │   ├── speaker.handlers.ts     # 声纹相关方法
│   │   └── stt.handlers.ts         # STT 相关方法
│   │
│   └── types/                      # 类型定义
│       ├── speaker.types.ts
│       └── message.types.ts
│
├── package.json
└── tsconfig.json
```

---

## 3. 数据模型

### 3.1 Android 端数据模型

```kotlin
// speaker/model/SpeakerId.kt
/**
 * 声纹 ID 模型
 * 由 Gateway 生成，基于声纹特征哈希
 */
data class SpeakerId(
    val id: String,              // 完整 ID，如 "spk_a3f7b2_M"
    val hash: String,            // 声纹特征哈希
    val gender: String?,         // M/F/U
    val registeredAt: Long       // 注册时间戳
) {
    companion object {
        const val PREFIX = "spk_"
        const val UNKNOWN_PREFIX = "spk_unknown_"

        fun isValid(id: String): Boolean {
            return id.startsWith(PREFIX) && !id.startsWith(UNKNOWN_PREFIX)
        }
    }
}

// speaker/model/SpeakerProfile.kt
/**
 * 声纹档案（本地缓存）
 * 仅存储 ID 和元数据，不存储声纹特征
 */
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

// stt/LanguageSettings.kt
/**
 * 语音识别语言设置
 */
enum class SttLanguage(val code: String) {
    ZH("zh"),           // 普通话
    NAN("nan"),         // 闽南语
    AUTO("auto");       // 自动检测

    companion object {
        fun fromCode(code: String): SttLanguage {
            return values().find { it.code == code } ?: ZH
        }
    }
}
```

### 3.2 Gateway 端数据模型

```typescript
// types/speaker.types.ts

/**
 * 声纹特征向量（存储在 Gateway）
 */
interface SpeakerEmbedding {
  id: string; // 声纹 ID
  hash: string; // 特征哈希
  embedding: number[]; // 声纹特征向量（128-512 维）
  gender?: "M" | "F" | "U"; // 性别
  createdAt: number; // 创建时间
  updatedAt: number; // 更新时间
}

/**
 * 声纹识别结果
 */
interface SpeakerIdentificationResult {
  speakerId: string; // 识别的声纹 ID
  confidence: number; // 置信度（0-1）
  isKnown: boolean; // 是否已知说话人
}

/**
 * 声纹注册请求
 */
interface SpeakerEnrollmentRequest {
  audioData: string; // Base64 编码的音频数据
  gender?: "M" | "F" | "U"; // 可选性别提示
}

/**
 * 声纹注册响应
 */
interface SpeakerEnrollmentResponse {
  speakerId: string; // 生成的声纹 ID
  hash: string; // 声纹哈希
  confidence: number; // 注册质量置信度
}

/**
 * 实时识别请求
 */
interface SpeakerIdentificationRequest {
  audioData: string; // Base64 编码的音频数据
  threshold?: number; // 识别阈值（默认 0.8）
}
```

---

## 4. 关键技术点

### 4.1 声纹 ID 生成算法

**目标**：基于声纹特征生成唯一且一致的 ID

```typescript
// src/speaker/SpeakerIdGenerator.ts

import { createHash } from "crypto";

export class SpeakerIdGenerator {
  /**
   * 基于声纹嵌入向量生成唯一 ID
   * 确保相同声纹特征始终生成相同 ID
   */
  static generate(embedding: number[], gender?: "M" | "F" | "U"): string {
    // 1. 归一化特征向量
    const normalized = this.normalize(embedding);

    // 2. 取前 64 维计算哈希
    const featureBytes = this.toBytes(normalized.slice(0, 64));

    // 3. 计算 SHA-256 哈希
    const hash = createHash("sha256").update(featureBytes).digest("hex");

    // 4. 取前 6 位作为短哈希
    const shortHash = hash.substring(0, 6);

    // 5. 生成完整 ID
    const genderCode = gender || "U";
    return `spk_${shortHash}_${genderCode}`;
  }

  /**
   * 归一化特征向量
   */
  private static normalize(embedding: number[]): number[] {
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map((val) => val / magnitude);
  }

  /**
   * 将浮点数组转换为字节数组
   */
  private static toBytes(floats: number[]): Buffer {
    const buffer = Buffer.alloc(floats.length * 4);
    floats.forEach((val, i) => {
      buffer.writeFloatLE(val, i * 4);
    });
    return buffer;
  }
}
```

**一致性保证**：

- 相同的声纹特征 → 相同的归一化结果 → 相同的哈希 → 相同的 ID
- 不同设备注册相同声纹 → 返回相同 ID
- 同一声纹多次注册 → 返回相同 ID（幂等性）

### 4.2 Gateway 声纹识别流程

```
┌─────────────────────────────────────────────────────────────┐
│                     声纹注册流程                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Android                      Gateway                       │
│    │                            │                           │
│    │  1. 发送音频数据            │                           │
│    │ ─────────────────────────> │                           │
│    │    {audio: base64, gender?}│                           │
│    │                            │                           │
│    │                            │ 2. 提取声纹特征            │
│    │                            │    (Picovoice/Azure)      │
│    │                            │                           │
│    │                            │ 3. 生成声纹 ID             │
│    │                            │    (基于特征哈希)          │
│    │                            │                           │
│    │                            │ 4. 存储声纹特征            │
│    │                            │    (本地数据库)            │
│    │                            │                           │
│    │  5. 返回声纹 ID             │                           │
│    │ <───────────────────────── │                           │
│    │    {speakerId, hash, conf} │                           │
│    │                            │                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     实时识别流程                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Android                      Gateway                       │
│    │                            │                           │
│    │  1. 发送音频数据            │                           │
│    │ ─────────────────────────> │                           │
│    │    {audio: base64}         │                           │
│    │                            │                           │
│    │                            │ 2. 提取声纹特征            │
│    │                            │                           │
│    │                            │ 3. 匹配声纹库              │
│    │                            │    (计算相似度)            │
│    │                            │                           │
│    │                            │ 4. 返回匹配结果            │
│    │                            │                           │
│    │  5. 返回声纹 ID             │                           │
│    │ <───────────────────────── │                           │
│    │    {speakerId, confidence} │                           │
│    │                            │                           │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 闽南语 STT 集成

```typescript
// src/stt/NanSttService.ts

import { OpenAI } from "openai";

export class NanSttService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * 闽南语语音识别
   */
  async transcribe(audioData: Buffer): Promise<string> {
    const response = await this.openai.audio.transcriptions.create({
      file: new File([audioData], "audio.wav", { type: "audio/wav" }),
      model: "whisper-1",
      language: "nan", // 闽南语语言代码
      response_format: "text",
    });

    return response.text;
  }
}
```

**语言切换实现**：

```kotlin
// Android 端语言切换
class SttLanguageManager @Inject constructor(
    private val gatewaySession: GatewaySession
) {
    private var currentLanguage: SttLanguage = SttLanguage.ZH

    fun setLanguage(language: SttLanguage) {
        currentLanguage = language
        // 通知 Gateway 切换语言
        gatewaySession.sendEvent("stt.setLanguage", """
            {"language": "${language.code}"}
        """.trimIndent())
    }

    fun getCurrentLanguage(): SttLanguage = currentLanguage
}
```

### 4.4 消息发送与声纹 ID 传递

```kotlin
// Android 端消息发送
class VoiceMessageSender @Inject constructor(
    private val gatewaySession: GatewaySession,
    private val speakerRecognitionManager: SpeakerRecognitionManager
) {
    /**
     * 发送语音消息，自动携带声纹 ID
     */
    suspend fun sendVoiceMessage(
        text: String,
        audioData: ByteArray
    ) {
        // 1. 识别说话人
        val speakerResult = speakerRecognitionManager.identify(audioData)
        val speakerId = speakerResult?.id ?: "spk_unknown"

        // 2. 发送消息（携带声纹 ID）
        val params = buildJsonObject {
            put("message", text)
            put("speakerId", speakerId)
            put("channel", "voice")
            // 注意：不使用独立会话，依赖 OpenClaw 群聊能力
        }

        gatewaySession.request("chat.send", params.toString())
    }
}
```

**Gateway 端消息处理**：

```typescript
// Gateway Extension 消息处理器
api.registerGatewayMethod("chat.send", async ({ params, respond }) => {
  const { message, speakerId, channel } = params;

  // 构建消息上下文
  const messageContext = {
    content: message,
    metadata: {
      speakerId, // 声纹 ID，智能体通过此区分说话人
      channel, // 消息通道
      timestamp: Date.now(),
    },
  };

  // 转发给 OpenClaw Agent
  // Agent 通过 speakerId 识别不同说话人，无需会话隔离
  const response = await api.runtime.agent.sendMessage(messageContext);

  respond(true, { messageId: response.id });
});
```

### 4.5 声纹数据存储方案

**Gateway 端存储结构**：

```
~/.openclaw/speaker-recognition/
├── embeddings/                     # 声纹特征向量
│   ├── spk_a3f7b2_M.json
│   ├── spk_9e2d1c_F.json
│   └── ...
├── index.json                      # 声纹索引
└── config.json                     # 配置
```

**index.json 示例**：

```json
{
  "version": "1.0",
  "speakers": [
    {
      "id": "spk_a3f7b2_M",
      "hash": "a3f7b2",
      "gender": "M",
      "createdAt": 1707000000000,
      "updatedAt": 1707000000000
    }
  ],
  "totalCount": 1
}
```

**单个声纹文件示例**（spk_a3f7b2_M.json）：

```json
{
  "id": "spk_a3f7b2_M",
  "hash": "a3f7b2",
  "embedding": [0.123, -0.456, 0.789, ...],  // 128-512 维向量
  "gender": "M",
  "createdAt": 1707000000000,
  "updatedAt": 1707000000000
}
```

### 4.6 错误处理与降级策略

| 场景                   | 处理策略                                 |
| ---------------------- | ---------------------------------------- |
| 声纹识别失败           | 返回 `spk_unknown_{timestamp}`，继续对话 |
| Gateway 声纹服务不可用 | 使用默认 ID `spk_default`，不中断对话    |
| 闽南语 STT 失败        | 自动回退到普通话识别                     |
| 网络断开               | 本地缓存已注册声纹 ID，恢复后同步        |
| 声纹匹配置信度低       | 提示用户重新注册或标记为未知             |

---

## 5. 接口定义

### 5.1 Android → Gateway 接口

```typescript
// Gateway 方法注册

// 声纹注册
api.registerGatewayMethod("speaker.enroll", async ({ params, respond }) => {
  // params: { audioData: string, gender?: 'M'|'F'|'U' }
  // response: { speakerId: string, hash: string, confidence: number }
});

// 声纹识别
api.registerGatewayMethod("speaker.identify", async ({ params, respond }) => {
  // params: { audioData: string, threshold?: number }
  // response: { speakerId: string, confidence: number, isKnown: boolean }
});

// 获取已注册声纹列表
api.registerGatewayMethod("speaker.list", async ({ params, respond }) => {
  // response: { speakers: Array<{id, hash, gender, createdAt}> }
});

// 删除声纹
api.registerGatewayMethod("speaker.delete", async ({ params, respond }) => {
  // params: { speakerId: string }
  // response: { success: boolean }
});

// 设置 STT 语言
api.registerGatewayMethod("stt.setLanguage", async ({ params, respond }) => {
  // params: { language: 'zh'|'nan'|'auto' }
  // response: { success: boolean }
});
```

### 5.2 Gateway → Android 事件

```typescript
// Gateway 事件推送

// 声纹识别结果（实时）
api.pushEvent("speaker.identified", {
  speakerId: string,
  confidence: number,
  timestamp: number,
});

// 语言切换确认
api.pushEvent("stt.languageChanged", {
  language: string,
  timestamp: number,
});
```

---

## 6. 安全考虑

1. **声纹数据加密**：Gateway 本地存储的声纹特征使用 AES-256 加密
2. **传输加密**：WebSocket 使用 WSS（TLS）
3. **声纹 ID 匿名化**：ID 不包含任何个人身份信息
4. **权限控制**：Android 端仅存储 ID 列表，不存储声纹特征
5. **数据隔离**：不同用户的声纹数据在 Gateway 层隔离存储

---

**文档版本**: 1.0  
**创建日期**: 2026-02-04  
**作者**: OpenClaw Team
