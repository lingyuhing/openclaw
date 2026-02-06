# OpenClaw C4 Model - Level 1: System Context

## 系统上下文图

```mermaid
flowchart TB
    %% External Systems
    Users(["Users<br/>个人用户"])
    ExternalApps(["External Apps<br/>外部应用"])
    
    %% Channels (External Systems)
    WhatsApp["WhatsApp<br/>消息平台"]
    Telegram["Telegram<br/>消息平台"]
    Slack["Slack<br/>协作平台"]
    Discord["Discord<br/>社区平台"]
    Signal["Signal<br/>安全通讯"]
    iMessage["iMessage<br/>苹果消息"]
    
    %% AI Models (External)
    Anthropic["Anthropic<br/>Claude API"]
    OpenAI["OpenAI<br/>GPT API"]
    
    %% Core System
    OpenClaw["**OpenClaw**<br/>个人AI助手系统<br/><br/>提供统一的消息处理、<br/>AI对话和自动化能力"]
    
    %% Relationships
    Users -->|发送消息| WhatsApp
    Users -->|发送消息| Telegram
    Users -->|发送消息| Slack
    Users -->|发送消息| Discord
    Users -->|发送消息| Signal
    Users -->|发送消息| iMessage
    
    ExternalApps -->|API调用| OpenClaw
    
    WhatsApp -->|Webhook/WS| OpenClaw
    Telegram -->|Bot API| OpenClaw
    Slack -->|Bolt API| OpenClaw
    Discord -->|Discord.js| OpenClaw
    Signal -->|signal-cli| OpenClaw
    iMessage -->|BlueBubbles| OpenClaw
    
    OpenClaw -->|LLM请求| Anthropic
    OpenClaw -->|LLM请求| OpenAI
    
    Anthropic -->|AI回复| OpenClaw
    OpenAI -->|AI回复| OpenClaw
    
    OpenClaw -->|回复消息| WhatsApp
    OpenClaw -->|回复消息| Telegram
    OpenClaw -->|回复消息| Slack
    OpenClaw -->|回复消息| Discord
    OpenClaw -->|回复消息| Signal
    OpenClaw -->|回复消息| iMessage
```

## 图表说明

### 核心系统
- **OpenClaw**: 个人AI助手系统，作为中央网关，整合多个消息平台，提供AI对话能力

### 外部系统 - 消息平台 (Channels)
- **WhatsApp**: 通过 Baileys 库连接
- **Telegram**: 通过 grammY 库连接
- **Slack**: 通过 Bolt API 连接
- **Discord**: 通过 discord.js 连接
- **Signal**: 通过 signal-cli 连接
- **iMessage**: 通过 BlueBubbles 连接

### 外部系统 - AI 模型
- **Anthropic Claude**: 主要推荐的 AI 模型
- **OpenAI GPT**: 备选 AI 模型

### 用户类型
- **个人用户**: 通过各类消息应用与 OpenClaw 交互
- **外部应用**: 通过 API 集成 OpenClaw 能力
