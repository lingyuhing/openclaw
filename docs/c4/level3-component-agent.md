# OpenClaw C4 Model - Level 3: Agent Component Diagram

## Agent 运行时组件图

```mermaid
flowchart TB
    %% External Connections
    Gateway["Gateway<br/>网关服务"]
    AIProviders["AI 提供商<br/>Anthropic / OpenAI / Google"]
    ToolImplementations["工具实现<br/>外部系统"]
    
    %% Agent Runtime Boundary
    subgraph AgentRuntime["**Agent 运行时**"]
        direction TB
        
        %% Core Agent
        subgraph CoreAgent["**核心 Agent**"]
            PiEmbeddedRunner["PiEmbeddedRunner<br/>PI 嵌入式运行器<br/>基于 pi-mono"]
            AgentLoop["Agent Loop<br/>Agent 主循环"]
            MessageProcessor["MessageProcessor<br/>消息处理器"]
            ContextManager["ContextManager<br/>上下文管理器"]
        end
        
        %% Model Layer
        subgraph ModelLayer["**模型层**"]
            ModelRouter["ModelRouter<br/>模型路由器"]
            AnthropicAdapter["AnthropicAdapter<br/>Claude 适配器"]
            OpenAIAdapter["OpenAIAdapter<br/>GPT 适配器"]
            GoogleAdapter["GoogleAdapter<br/>Gemini 适配器"]
            ModelFailover["ModelFailover<br/>模型故障转移"]
        end
        
        %% Tool System
        subgraph ToolSystem["**工具系统**"]
            ToolRegistry["ToolRegistry<br/>工具注册表"]
            ToolDispatcher["ToolDispatcher<br/>工具调度器"]
            ToolValidator["ToolValidator<br/>工具验证器"]
            ToolPolicyEngine["ToolPolicyEngine<br/>工具策略引擎"]
            ToolSandbox["ToolSandbox<br/>工具沙箱"]
        end
        
        %% Skills System
        subgraph SkillsSystem["**技能系统**"]
            SkillManager["SkillManager<br/>技能管理器"]
            SkillLoader["SkillLoader<br/>技能加载器"]
            SkillRegistry["SkillRegistry<br/>技能注册表"]
            ClawHubClient["ClawHubClient<br/>ClawHub 客户端"]
            BundledSkills["BundledSkills<br/>捆绑技能"]
            WorkspaceSkills["WorkspaceSkills<br/>工作区技能"]
        end
        
        %% Session & Memory
        subgraph SessionMemory["**会话与记忆**"]
            SessionManager["SessionManager<br/>会话管理器"]
            MemoryManager["MemoryManager<br/>记忆管理器"]
            VectorStore["VectorStore<br/>向量存储<br/>sqlite-vec"]
            SessionMemory2["SessionMemory<br/>会话记忆"]
        end
        
        %% Hooks System
        subgraph HooksSystem["**钩子系统**"]
            HookManager["HookManager<br/>钩子管理器"]
            HookExecutor["HookExecutor<br/>钩子执行器"]
            BundledHooks["BundledHooks<br/>捆绑钩子"]
        end
    end
    
    %% Connections - External to Agent
    Gateway <-->|WebSocket| PiEmbeddedRunner
    
    %% Internal Connections - Core Agent
    PiEmbeddedRunner <--> AgentLoop
    AgentLoop <--> MessageProcessor
    AgentLoop <--> ContextManager
    ContextManager <--> SessionMemory
    MessageProcessor <--> ToolSystem
    
    %% Model Layer Connections
    AgentLoop --> ModelRouter
    ModelRouter --> AnthropicAdapter
    ModelRouter --> OpenAIAdapter
    ModelRouter --> GoogleAdapter
    AnthropicAdapter -->|HTTP API| AIProviders
    OpenAIAdapter -->|HTTP API| AIProviders
    GoogleAdapter -->|HTTP API| AIProviders
    ModelRouter <--> ModelFailover
    
    %% Tool System Connections
    ToolRegistry --> ToolDispatcher
    ToolDispatcher --> ToolValidator
    ToolValidator --> ToolPolicyEngine
    ToolPolicyEngine --> ToolSandbox
    ToolSandbox -->|执行| ToolImplementations
    
    %% Skills System Connections
    SkillManager --> SkillLoader
    SkillLoader --> SkillRegistry
    SkillManager --> ClawHubClient
    SkillLoader --> BundledSkills
    SkillLoader --> WorkspaceSkills
    SkillRegistry --> ToolRegistry
    
    %% Session & Memory Connections
    SessionManager --> MemoryManager
    MemoryManager --> VectorStore
    MemoryManager --> SessionMemory2
    SessionMemory2 --> ContextManager
    
    %% Hooks System Connections
    HookManager --> HookExecutor
    HookExecutor --> BundledHooks
    HookExecutor --> AgentLoop
    
    %% Style Definitions
    classDef external fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef agent fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef subsystem fill:#f3e5f5,stroke:#4a148c,stroke-width:1px
    classDef component fill:#e8f5e9,stroke:#1b5e20,stroke-width:1px
    
    class Gateway,AIProviders,ToolImplementations external
    class AgentRuntime agent
    class CoreAgent,ModelLayer,ToolSystem,SkillsSystem,SessionMemory,HooksSystem subsystem
    class PiEmbeddedRunner,AgentLoop,MessageProcessor,ContextManager,ModelRouter,AnthropicAdapter,OpenAIAdapter,GoogleAdapter,ModelFailover,ToolRegistry,ToolDispatcher,ToolValidator,ToolPolicyEngine,ToolSandbox,SkillManager,SkillLoader,SkillRegistry,ClawHubClient,SessionManager,MemoryManager,VectorStore,SessionMemory2,HookManager,HookExecutor component
```

## 组件说明

### 核心 Agent
- **PiEmbeddedRunner**: 基于 pi-mono 的嵌入式运行器，Agent 的入口点
- **AgentLoop**: Agent 主循环，协调对话流程
- **MessageProcessor**: 处理传入消息，解析意图
- **ContextManager**: 管理对话上下文和历史

### 模型层
- **ModelRouter**: 智能路由到不同的 AI 提供商
- **AnthropicAdapter**: Claude API 适配器
- **OpenAIAdapter**: GPT API 适配器
- **GoogleAdapter**: Gemini API 适配器
- **ModelFailover**: 模型故障转移机制

### 工具系统
- **ToolRegistry**: 注册和管理可用工具
- **ToolDispatcher**: 调度工具执行
- **ToolValidator**: 验证工具参数
- **ToolPolicyEngine**: 工具策略引擎，控制权限
- **ToolSandbox**: 工具沙箱，隔离执行

### 技能系统
- **SkillManager**: 管理技能生命周期
- **SkillLoader**: 加载技能 (捆绑/工作区/ClawHub)
- **SkillRegistry**: 注册技能工具
- **ClawHubClient**: 连接 ClawHub 技能市场

### 会话与记忆
- **SessionManager**: 管理会话状态
- **MemoryManager**: 管理长期记忆
- **VectorStore**: 向量存储 (sqlite-vec)
- **SessionMemory**: 会话级记忆

### 钩子系统
- **HookManager**: 管理钩子生命周期
- **HookExecutor**: 执行钩子
- **BundledHooks**: 捆绑的钩子 (session-memory, command-logger 等)
