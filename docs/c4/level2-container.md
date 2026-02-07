# OpenClaw C4 Model - Level 2: Container Diagram

## 容器图

```mermaid
flowchart TB
    %% External Systems
    Channels["**消息平台**<br/>WhatsApp<br/>Telegram<br/>Slack<br/>Discord<br/>..."]
    AIProviders["**AI 提供商**<br/>Anthropic<br/>OpenAI<br/>Google<br/>..."]
    Users(["**用户**<br/>最终用户<br/>管理员"])

    %% OpenClaw System Boundary
    subgraph OpenClaw["**OpenClaw 系统**"]
        direction TB

        %% Gateway - Core
        subgraph Gateway["**Gateway 网关**<br/>端口: 18789<br/><br/>WebSocket 控制中心"]
            GatewayServer["Gateway Server<br/>WebSocket Server"]
            ProtocolHandler["Protocol Handler<br/>协议处理器"]
            SessionManager["Session Manager<br/>会话管理"]
            ConfigManager["Config Manager<br/>配置管理"]
        end

        %% Agent Runtime
        subgraph Agent["**Agent 运行时**"]
            PiAgent["Pi Agent Runtime<br/>基于 pi-mono"]
            ToolRegistry["Tool Registry<br/>工具注册表"]
            SkillManager["Skill Manager<br/>技能管理器"]
        end

        %% Channels
        subgraph ChannelAdapters["**Channel 适配器**"]
            WhatsAppAdapter["WhatsApp Adapter<br/>(Baileys)"]
            TelegramAdapter["Telegram Adapter<br/>(grammY)"]
            SlackAdapter["Slack Adapter<br/>(Bolt)"]
            DiscordAdapter["Discord Adapter<br/>(discord.js)"]
            SignalAdapter["Signal Adapter<br/>(signal-cli)"]
            IMessageAdapter["iMessage Adapter<br/>(BlueBubbles)"]
        end

        %% Web Layer
        subgraph WebLayer["**Web 层**"]
            ControlUI["Control UI<br/>控制界面<br/>端口: 18789"]
            WebChat["WebChat<br/>网页聊天<br/>端口: 18789"]
            CanvasHost["Canvas Host<br/>A2UI 画布<br/>端口: 18793"]
        end

        %% CLI Layer
        subgraph CLILayer["**CLI 层**"]
            CLI["OpenClaw CLI<br/>命令行工具"]
            GatewayCommand["Gateway Command<br/>网关管理"]
            AgentCommand["Agent Command<br/>Agent 管理"]
            ChannelsCommand["Channels Command<br/>频道管理"]
            ConfigCommand["Config Command<br/>配置管理"]
        end

        %% Data Stores
        subgraph DataLayer["**数据层**"]
            ConfigStore["Config Store<br/>配置存储<br/>~/.openclaw/config.json"]
            SessionStore["Session Store<br/>会话存储<br/>~/.openclaw/sessions/"]
            CredentialStore["Credential Store<br/>凭证存储<br/>~/.openclaw/credentials/"]
            SkillStore["Skill Store<br/>技能存储<br/>~/.openclaw/workspace/skills/"]
        end这个文件夹中画出安卓 APP 的 c4图

        %% Client Apps (Companion)
        subgraph CompanionApps["**配套应用**"]
            macOSApp["macOS App<br/>菜单栏应用"]
            iOSApp["iOS App<br/>节点应用"]
            AndroidApp["<a href='./level3-component-android-app.md'>Android App<br/>节点应用</a>"]
        end
    end

    %% Connections - External
    Users -->|使用| CLI
    Users -->|使用| ControlUI
    Users -->|使用| macOSApp
    Users -->|聊天| Channels

    Channels <-->|消息收发| ChannelAdapters
    AIProviders <-->|LLM API| PiAgent

    %% Internal Connections - Gateway
    GatewayServer --> ProtocolHandler
    ProtocolHandler --> SessionManager
    ProtocolHandler --> ConfigManager
    GatewayServer -->|WebSocket| PiAgent
    GatewayServer -->|WebSocket| ChannelAdapters
    GatewayServer -->|WebSocket| CompanionApps

    %% Agent Connections
    PiAgent --> ToolRegistry
    ToolRegistry --> SkillManager
    PiAgent -->|调用工具| CLILayer

    %% CLI Connections
    CLI --> GatewayCommand
    CLI --> AgentCommand
    CLI --> ChannelsCommand
    CLI --> ConfigCommand
    GatewayCommand -->|管理| GatewayServer
    ChannelsCommand -->|管理| ChannelAdapters
    ConfigCommand -->|读写| ConfigStore

    %% Web Layer Connections
    ControlUI -->|内嵌| GatewayServer
    WebChat -->|使用| GatewayServer
    CanvasHost -->|A2UI| PiAgent

    %% Data Layer Connections
    GatewayServer -->|读取| ConfigStore
    GatewayServer -->|读写| SessionStore
    GatewayServer -->|读写| CredentialStore
    SkillManager -->|加载| SkillStore
    ChannelAdapters -->|读写| CredentialStore

    %% Companion Apps Connections
    macOSApp -->|WebSocket| GatewayServer
    iOSApp -->|WebSocket| GatewayServer
    AndroidApp -->|WebSocket| GatewayServer
```

## 容器说明

### 1. Gateway 网关 (核心控制中心)

- **Gateway Server**: WebSocket 服务器，所有客户端连接的入口点
- **Protocol Handler**: 处理 Gateway 协议消息，验证 JSON Schema
- **Session Manager**: 管理用户会话状态和生命周期
- **Config Manager**: 管理配置文件的读写和验证

### 2. Agent 运行时

- **Pi Agent Runtime**: 基于 pi-mono 的 AI Agent 运行时环境
- **Tool Registry**: 工具注册表，管理可用工具
- **Skill Manager**: 技能管理器，加载和管理技能插件

### 3. Channel 适配器

- 集成多个消息平台: WhatsApp, Telegram, Slack, Discord, Signal, iMessage 等
- 统一的消息收发接口

### 4. Web 层

- **Control UI**: Web 控制界面，用于管理 Gateway
- **WebChat**: 网页聊天界面
- **Canvas Host**: A2UI 画布服务，提供 Agent 可编辑的 HTML 界面

### 5. CLI 层

- **OpenClaw CLI**: 命令行工具，提供完整的操作接口
- 子命令: gateway, agent, channels, config 等

### 6. 数据层

- **Config Store**: 配置存储 (~/.openclaw/config.json)
- **Session Store**: 会话存储 (~/.openclaw/sessions/)
- **Credential Store**: 凭证存储 (~/.openclaw/credentials/)
- **Skill Store**: 技能存储 (~/.openclaw/workspace/skills/)

### 7. 配套应用

- **macOS App**: 菜单栏应用，提供系统级集成
- **iOS App**: iOS 节点应用
- **Android App**: Android 节点应用
