# 音频处理详细流程图和时序图

本文档详细描述 OpenClaw 接收到音频后的完整处理流程，包括流程图和时序图。

## 核心原则

**无论语音中有几个说话人（包括只有一个人），都必须给每个声纹打上唯一的、确定性的 ID。**

---

## 1. 音频处理总流程图

```mermaid
flowchart TB
    Start([接收到音频]) --> AudioInput{音频输入}
    
    AudioInput --> Buffer[音频 Buffer]
    
    subgraph AudioPreprocessing[音频预处理]
        Buffer --> AudioValidation{音频验证}
        AudioValidation -->|无效| Error1[返回错误]
        AudioValidation -->|有效| AudioFormat[格式转换<br/>统一为 WAV/PCM]
        AudioFormat --> SampleRate[采样率标准化<br/>16kHz/16bit]
        SampleRate --> AudioChunking[音频分块<br/>可选：长音频切分]
    end
    
    AudioChunking --> DiarizationCheck{检查配置}
    
    DiarizationCheck -->|diarization=false| SimpleSTT[简单 STT 转录]
    SimpleSTT --> SimpleOutput[输出纯文本]
    
    DiarizationCheck -->|diarization=true| DiarizationFlow[说话人分离流程]
    
    subgraph DiarizationEngine[说话人分离引擎]
        DiarizationFlow --> ProviderSelect[选择 STT 提供商]
        ProviderSelect --> DeepgramSTT[Deepgram<br/>diarization=true]
        ProviderSelect --> GoogleSTT[Google Cloud<br/>enableSpeakerDiarization]
        
        DeepgramSTT --> STTResponse[接收转录响应<br/>带 speaker 标签]
        GoogleSTT --> STTResponse
        
        STTResponse --> ExtractSegments[提取语音片段]
        ExtractSegments --> Segment1[片段 1: 时间点 A-B]
        ExtractSegments --> Segment2[片段 2: 时间点 C-D]
        ExtractSegments --> SegmentN[片段 N...]
    end
    
    subgraph VoiceprintProcessing[声纹处理]
        Segment1 --> VoiceprintExtract1[提取声纹特征<br/>MFCC / x-vector / d-vector]
        Segment2 --> VoiceprintExtract2[提取声纹特征]
        SegmentN --> VoiceprintExtractN[提取声纹特征]
        
        VoiceprintExtract1 --> VoiceprintClustering[声纹聚类<br/>合并相同声纹]
        VoiceprintExtract2 --> VoiceprintClustering
        VoiceprintExtractN --> VoiceprintClustering
        
        VoiceprintClustering --> UniqueVoiceprints[唯一声纹列表]
    end
    
    subgraph VoiceprintIdGeneration[声纹 ID 生成]
        UniqueVoiceprints --> VoiceprintIdGen1[声纹 1: 特征向量哈希]
        UniqueVoiceprints --> VoiceprintIdGen2[声纹 2: 特征向量哈希]
        UniqueVoiceprints --> VoiceprintIdGenN[声纹 N: 特征向量哈希]
        
        VoiceprintIdGen1 --> HashAlgorithm1[SHA-256 哈希]
        VoiceprintIdGen2 --> HashAlgorithm2[SHA-256 哈希]
        VoiceprintIdN --> HashAlgorithmN[SHA-256 哈希]
        
        HashAlgorithm1 --> VoiceprintId1["声纹 ID 1:<br/>vpr_a1b2c3d4..."]
        HashAlgorithm2 --> VoiceprintId2["声纹 ID 2:<br/>vpr_e5f6g7h8..."]
        HashAlgorithmN --> VoiceprintIdN["声纹 ID N:<br/>vpr_i9j0k1l2..."]
        
        VoiceprintId1 --> SpeakerIdMapping[声纹 ID 映射]
        VoiceprintId2 --> SpeakerIdMapping
        VoiceprintIdN --> SpeakerIdMapping
        
        SpeakerIdMapping --> FinalSpeakerId1["Speaker vpr_a1b2c3d4..."]
        SpeakerIdMapping --> FinalSpeakerId2["Speaker vpr_e5f6g7h8..."]
        SpeakerIdMapping --> FinalSpeakerIdN["Speaker vpr_i9j0k1l2..."]
    end
    
    FinalSpeakerId1 --> TranscriptMapping[转录文本映射]
    FinalSpeakerId2 --> TranscriptMapping
    FinalSpeakerIdN --> TranscriptMapping
    
    TranscriptMapping --> FormatTranscript[格式化转录结果]
    FormatTranscript --> StructuredOutput["结构化输出"]
    
    StructuredOutput --> End([处理完成])
    
    style Start fill:#e8f5e9
    style End fill:#e8f5e9
    style AudioInput fill:#e1f5fe
    style DiarizationFlow fill:#fff3e0
    style VoiceprintProcessing fill:#f3e5f5
    style VoiceprintIdGeneration fill:#fff3e0
    style StructuredOutput fill:#e1f5fe
```

---

## 2. 单说话人场景处理流程图

```mermaid
flowchart TB
    Start([单说话人音频]) --> AudioBuffer[音频 Buffer]
    
    AudioBuffer --> FeatureExtract[提取声纹特征<br/>MFCC / x-vector]
    
    FeatureExtract --> HashGen[SHA-256 哈希生成]
    
    HashGen --> VoiceprintId["声纹 ID:<br/>vpr_7a3f9c2d..."]
    
    VoiceprintId --> STT[STT 转录]
    
    STT --> TextTranscript["转录文本"]
    
    TextTranscript --> Output["输出:<br/>Speaker vpr_7a3f9c2d...: 转录内容"]
    
    Output --> End([完成])
    
    style Start fill:#e8f5e9
    style End fill:#e8f5e9
    style VoiceprintId fill:#fff3e0
    style Output fill:#e1f5fe
```

---

## 3. 声纹 ID 生成详细流程图

```mermaid
flowchart TB
    Start([音频片段]) --> AudioSegment[语音片段<br/>时间点 A-B]
    
    AudioSegment --> VoiceprintExtract[声纹特征提取]
    
    subgraph FeatureExtraction[特征提取]
        VoiceprintExtract --> MFCC[MFCC 特征<br/>梅尔频率倒谱系数]
        VoiceprintExtract --> XVector[x-vector<br/>说话人嵌入向量]
        VoiceprintExtract --> DVector[d-vector<br/>深度学习嵌入]
        
        MFCC --> FeatureVector[特征向量]
        XVector --> FeatureVector
        DVector --> FeatureVector
    end
    
    FeatureVector --> Normalization[向量归一化]
    
    Normalization --> HashInput[哈希输入准备]
    
    HashInput --> SHA256[SHA-256 哈希计算]
    
    SHA256 --> HashOutput[64 位十六进制哈希值]
    
    HashOutput --> Truncate[截断为 32 位<br/>前 32 个字符]
    
    Truncate --> AddPrefix[添加前缀<br/>vpr_]
    
    AddPrefix --> VoiceprintId["声纹 ID:<br/>vpr_7a3f9c2d8e1b4a5f6c3d9e2a1b7c8d3f"]
    
    VoiceprintId --> Verification[一致性验证]
    
    Verification -->|相同声纹| SameId[相同 ID]
    Verification -->|不同声纹| DiffId[不同 ID]
    
    SameId --> End([完成])
    DiffId --> End
    
    style Start fill:#e8f5e9
    style End fill:#e8f5e9
    style VoiceprintId fill:#fff3e0
    style FeatureExtraction fill:#f3e5f5
```

---

## 4. 完整时序图

```mermaid
sequenceDiagram
    autonumber
    
    participant User as 用户
    participant Channel as 消息渠道
    participant Gateway as Gateway
    participant AudioRouter as AudioRouter
    participant DiarizationEngine as DiarizationEngine
    participant STTProvider as STT Provider
    participant VoiceprintExtractor as VoiceprintExtractor
    participant VoiceprintIdGen as VoiceprintIdGenerator
    participant TranscriptFormatter as TranscriptFormatter
    participant Agent as Agent
    participant VoiceprintDB as Voiceprint Database
    
    Note over User,VoiceprintDB: 阶段 1: 接收音频
    User->>Channel: 1. 发送语音消息
    Channel->>Gateway: 2. 转发音频数据
    Gateway->>AudioRouter: 3. 音频 Buffer
    
    Note over AudioRouter: 阶段 2: 路由决策
    AudioRouter->>AudioRouter: 4. 检查配置 diarization=true
    AudioRouter->>DiarizationEngine: 5. 启用说话人分离
    
    Note over DiarizationEngine,STTProvider: 阶段 3: STT 转录
    DiarizationEngine->>DiarizationEngine: 6. 构建请求 diarization=true
    DiarizationEngine->>STTProvider: 7. POST /listen with diarization
    
    STTProvider->>STTProvider: 8. 执行 STT + 初步 Diarization
    STTProvider-->>DiarizationEngine: 9. 响应 words[] with speaker field
    
    Note over DiarizationEngine,VoiceprintExtractor: 阶段 4: 声纹提取
    DiarizationEngine->>DiarizationEngine: 10. 提取音频片段
    
    loop 对每个说话人
        DiarizationEngine->>VoiceprintExtractor: 11a. 提取声纹特征
        VoiceprintExtractor->>VoiceprintExtractor: 11b. MFCC / x-vector
        VoiceprintExtractor-->>DiarizationEngine: 11c. 声纹特征向量
    end
    
    Note over VoiceprintIdGen: 阶段 5: 声纹 ID 生成
    DiarizationEngine->>VoiceprintIdGen: 12. 生成声纹 ID
    VoiceprintIdGen->>VoiceprintIdGen: 13. SHA-256 哈希
    VoiceprintIdGen->>VoiceprintIdGen: 14. 添加前缀 vpr_
    VoiceprintIdGen-->>DiarizationEngine: 15. 声纹 ID: vpr_xxx...
    
    Note over VoiceprintDB: 阶段 6: 声纹存储
    DiarizationEngine->>VoiceprintDB: 16. 存储声纹特征
    VoiceprintDB-->>DiarizationEngine: 17. 存储确认
    
    Note over TranscriptFormatter: 阶段 7: 格式化输出
    DiarizationEngine->>TranscriptFormatter: 18. 转录结果 + 声纹 ID
    TranscriptFormatter->>TranscriptFormatter: 19. 按声纹 ID 分组
    TranscriptFormatter->>TranscriptFormatter: 20. 格式化文本
    TranscriptFormatter-->>DiarizationEngine: 21. 结构化转录
    
    Note over Agent: 阶段 8: Agent 处理
    DiarizationEngine-->>Agent: 22. 结构化转录文本
    Agent->>Agent: 23. LLM 处理
    Agent-->>Gateway: 24. 回复
    
    Note over Channel,User: 阶段 9: 返回用户
    Gateway-->>Channel: 25. 文本回复
    Channel-->>User: 26. 显示回复
    
    Note over User: 输出示例:<br/>Speaker vpr_a1b2c3: 你好<br/>Speaker vpr_d4e5f6: 你好
```

---

## 5. 单说话人场景时序图

```mermaid
sequenceDiagram
    autonumber
    
    participant User as 用户
    participant AudioRouter as AudioRouter
    participant DiarizationEngine as DiarizationEngine
    participant STTProvider as STT Provider
    participant VoiceprintExtractor as VoiceprintExtractor
    participant VoiceprintIdGen as VoiceprintIdGenerator
    participant VoiceprintDB as Voiceprint Database
    participant Agent as Agent
    
    Note over User: 场景: 单说话人音频
    User->>AudioRouter: 1. 发送语音消息
    
    AudioRouter->>AudioRouter: 2. 检查配置 diarization=true
    AudioRouter->>DiarizationEngine: 3. 启用说话人分离
    
    Note over DiarizationEngine,STTProvider: STT 转录阶段
    DiarizationEngine->>STTProvider: 4. 请求 STT + Diarization
    STTProvider->>STTProvider: 5. 识别出 1 个说话人
    STTProvider-->>DiarizationEngine: 6. 返回转录结果<br/>speaker=0
    
    Note over VoiceprintExtractor: 声纹提取阶段
    DiarizationEngine->>VoiceprintExtractor: 7. 提取声纹特征<br/>(即使只有一个说话人)
    VoiceprintExtractor->>VoiceprintExtractor: 8. 计算 MFCC / x-vector
    VoiceprintExtractor-->>DiarizationEngine: 9. 声纹特征向量
    
    Note over VoiceprintIdGen: 声纹 ID 生成阶段
    DiarizationEngine->>VoiceprintIdGen: 10. 生成声纹 ID
    VoiceprintIdGen->>VoiceprintIdGen: 11. 特征向量 → SHA-256 哈希
    VoiceprintIdGen->>VoiceprintIdGen: 12. 添加前缀 vpr_
    VoiceprintIdGen-->>DiarizationEngine: 13. 声纹 ID: vpr_xxx...
    
    Note over VoiceprintDB: 存储阶段
    DiarizationEngine->>VoiceprintDB: 14. 存储声纹特征和 ID
    VoiceprintDB-->>DiarizationEngine: 15. 确认存储
    
    Note over Agent: 输出阶段
    DiarizationEngine-->>Agent: 16. 结构化转录<br/>Speaker vpr_xxx: 转录内容
    
    Note over Agent: 最终输出:<br/>Speaker vpr_a1b2c3d4: 这是一段单说话人的语音
```

---

## 6. 声纹 ID 生成详细流程图

```mermaid
flowchart TB
    Start([音频片段]) --> AudioSegment[语音片段<br/>时间点 A-B]
    
    AudioSegment --> Preprocessing[音频预处理]
    
    subgraph AudioPreprocessing[音频预处理]
        Preprocessing --> Resampling[重采样<br/>16kHz]
        Resampling --> Preemphasis[预加重<br/>高频增强]
        Preemphasis --> Framing[分帧<br/>25ms 帧长]
        Framing --> Windowing[加窗<br/>汉明窗]
    end
    
    Windowing --> FeatureExtraction[特征提取]
    
    subgraph FeatureExtraction[特征提取层]
        FeatureExtraction --> MFCC[MFCC 特征<br/>梅尔频率倒谱系数]
        FeatureExtraction --> Delta[Delta 特征<br/>一阶差分]
        FeatureExtraction --> Delta2[Delta-Delta<br/>二阶差分]
        FeatureExtraction --> XVector[x-vector<br/>深度说话人嵌入]
        
        MFCC --> FeatureVector[特征向量拼接]
        Delta --> FeatureVector
        Delta2 --> FeatureVector
        XVector --> FeatureVector
    end
    
    FeatureVector --> Normalization[特征归一化]
    
    Normalization --> L2Norm[L2 归一化]
    
    L2Norm --> HashInput[哈希输入准备]
    
    HashInput --> BinarySerialization[二进制序列化]
    
    BinarySerialization --> SHA256[SHA-256 哈希计算]
    
    SHA256 --> HashOutput[64 位十六进制哈希值]
    
    HashOutput --> Truncate[截断为 32 位<br/>前 32 个字符]
    
    Truncate --> AddPrefix[添加前缀<br/>vpr_]
    
    AddPrefix --> VoiceprintId["声纹 ID:<br/>vpr_7a3f9c2d8e1b4a5f6c3d9e2a1b7c8d3f"]
    
    VoiceprintId --> Verification[一致性验证]
    
    Verification -->|相同声纹| SameId[相同 ID<br/>确定性保证]
    Verification -->|不同声纹| DiffId[不同 ID<br/>唯一性保证]
    
    SameId --> End([完成])
    DiffId --> End
    
    style Start fill:#e8f5e9
    style End fill:#e8f5e9
    style VoiceprintId fill:#fff3e0
    style FeatureExtraction fill:#f3e5f5
    style AudioPreprocessing fill:#e1f5fe
```

---

## 7. 状态转换图

```mermaid
stateDiagram-v2
    [*] --> AudioReceived: 接收到音频
    
    AudioReceived --> AudioValidation: 音频验证
    
    AudioValidation --> Invalid: 验证失败
    AudioValidation --> Preprocessing: 验证通过
    
    Invalid --> [*]: 返回错误
    
    Preprocessing --> FeatureExtraction: 音频预处理完成
    
    FeatureExtraction --> SingleSpeaker: 检测到 1 个说话人
    FeatureExtraction --> MultipleSpeakers: 检测到 N 个说话人
    
    SingleSpeaker --> VoiceprintExtraction: 提取声纹特征
    MultipleSpeakers --> VoiceprintExtraction: 分别提取每个声纹
    
    VoiceprintExtraction --> VoiceprintIdGeneration: 声纹特征提取完成
    
    VoiceprintIdGeneration --> SingleId: 生成 1 个声纹 ID
    VoiceprintIdGeneration --> MultipleIds: 生成 N 个声纹 ID
    
    SingleId --> IdMapping: ID 映射
    MultipleIds --> IdMapping: ID 映射
    
    IdMapping --> TranscriptFormatting: 转录格式化
    
    TranscriptFormatting --> OutputGeneration: 生成输出
    
    OutputGeneration --> [*]: 处理完成
    
    style AudioReceived fill:#e1f5fe
    style VoiceprintIdGeneration fill:#fff3e0
    style OutputGeneration fill:#e8f5e9
```

---

## 8. 关键处理逻辑说明

### 8.1 单说话人处理逻辑

```
当检测到只有一个说话人时：

1. 仍然执行完整的声纹提取流程
2. 计算该说话人的声纹特征向量
3. 使用 SHA-256 生成唯一的声纹 ID
4. 输出格式："Speaker vpr_xxx: 转录内容"

注意：即使只有一个人说话，也要打 ID！
```

### 8.2 多说话人处理逻辑

```
当检测到多个说话人时：

1. 分别提取每个说话人的声纹特征
2. 对每个声纹计算 SHA-256 哈希
3. 为每个说话人生成唯一的声纹 ID
4. 按时间顺序组织对话
5. 输出格式：
   "Speaker vpr_xxx: 说话人 A 的内容"
   "Speaker vpr_yyy: 说话人 B 的内容"
```

### 8.3 声纹 ID 确定性保证

```
声纹 ID 生成算法：

输入：声纹特征向量 V = [v1, v2, v3, ..., vn]
步骤 1: 向量归一化 V' = V / ||V||
步骤 2: 二进制序列化 B = serialize(V')
步骤 3: SHA-256 哈希 H = sha256(B)
步骤 4: 取前 32 位 H32 = H[0:32]
步骤 5: 添加前缀 ID = "vpr_" + H32

输出：确定性声纹 ID

特性：
- 相同声纹 → 相同特征向量 → 相同哈希 → 相同 ID
- 不同声纹 → 不同特征向量 → 不同哈希 → 不同 ID
- 跨平台一致：使用相同算法，相同声纹一定得到相同 ID
```

---

## 9. 错误处理流程

```mermaid
flowchart TB
    Start([开始处理]) --> Validation[音频验证]
    
    Validation -->|验证失败| InvalidAudio[无效音频]
    Validation -->|验证通过| Extraction[声纹提取]
    
    InvalidAudio --> ErrorHandler1[错误处理]
    ErrorHandler1 --> LogError1[记录错误日志]
    LogError1 --> ReturnError1[返回错误信息]
    ReturnError1 --> End1([结束])
    
    Extraction -->|提取失败| ExtractionError[声纹提取失败]
    Extraction -->|提取成功| IdGeneration[声纹 ID 生成]
    
    ExtractionError --> ErrorHandler2[错误处理]
    ErrorHandler2 --> FallbackSTT[回退到简单 STT]
    FallbackSTT --> ReturnPartial[返回部分结果]
    ReturnPartial --> End2([结束])
    
    IdGeneration -->|生成失败| IdGenError[ID 生成失败]
    IdGeneration -->|生成成功| Transcript[转录格式化]
    
    IdGenError --> ErrorHandler3[错误处理]
    ErrorHandler3 --> Retry[重试机制]
    Retry --> IdGeneration
    
    Transcript --> Output[生成输出]
    Output --> End3([成功结束])
    
    style Start fill:#e8f5e9
    style End1 fill:#ffebee
    style End2 fill:#fff3e0
    style End3 fill:#e8f5e9
    style Output fill:#e1f5fe
```

---

## 10. 配置示例

```yaml
# 完整配置示例
tools:
  media:
    audio:
      enabled: true
      diarization: true
      diarizationOptions:
        provider: deepgram
        model: nova-2
        # 关键配置：即使只有一个说话人，也强制生成声纹 ID
        speakerCountMin: 1  # 设置为1，确保单说话人也处理
        speakerCountMax: 10
        # 强制为所有说话人生成声纹 ID（包括单说话人场景）
        forceVoiceprintIdForAllSpeakers: true
        speakerLabelFormat: "Speaker {id}"
        utterances: true
      
      # 声纹 ID 生成配置
      voiceprintIdGeneration:
        algorithm: sha256
        vectorNormalization: l2
        outputFormat: "vpr_{hash}"
        hashTruncation: 32  # 取前32位
      
      # 声纹数据库配置
      voiceprintDatabase:
        enabled: true
        storage: sqlite
        tableName: voiceprints
        indexByHash: true
      
      # 错误处理配置
      errorHandling:
        fallbackToSimpleSTT: true
        retryAttempts: 3
        logErrors: true
```

---

## 总结

本文档详细描述了 OpenClaw 接收到音频后的完整处理流程，包括：

1. **流程图**: 从音频接收到最终输出的完整流程
2. **单说话人处理**: 详细说明即使只有一个说话人也要打 ID
3. **声纹 ID 生成**: 详细的声纹特征提取和 ID 生成流程
4. **时序图**: 完整的时序交互图
5. **状态图**: 音频处理的状态转换
6. **错误处理**: 完整的错误处理流程

**核心原则强调**：
- ✅ 无论语音中有几个说话人（包括只有一个人），都必须给每个声纹打上唯一的、确定性的 ID
- ✅ 使用相同的算法在任何地方生成的 ID 必须相同（只要声纹相同）
- ✅ ID 必须与声纹特征强相关
