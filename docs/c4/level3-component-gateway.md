# OpenClaw C4 Model - Level 3: Gateway Component Diagram

## Gateway 组件图

```mermaid
flowchart TB
    %% External Connections
    WSClients["**WebSocket Clients**<br/>macOS App / CLI / WebUI"]
    Nodes["**Nodes**<br/>iOS / Android / macOS"]
    Channels["**Channel Adapters**<br/>WhatsApp / Telegram / etc."]
    PiAgent["**Pi Agent Runtime**<br/>AI Agent"]
    
    %% Gateway System Boundary
    subgraph Gateway["**Gateway 系统**"]
        direction TB
        
        %% WebSocket Server Layer
        subgraph WSLayer["**WebSocket 层**"]
            WSServer["WebSocketServer<br/>ws 库封装"]
            ConnectionManager["ConnectionManager<br/>连接管理器"]
            HeartbeatHandler["HeartbeatHandler<br/>心跳处理器"]
        end
        
        %% Protocol Layer
        subgraph ProtocolLayer["**Protocol 层**"]
            MessageParser["MessageParser<br/>消息解析器"]
            SchemaValidator["SchemaValidator<br/>Schema 验证器<br/>(TypeBox)"]
            MethodRouter["MethodRouter<br/>方法路由器"]
        end
        
        %% Session & State
        subgraph SessionLayer["**Session 层**"]
            SessionManager["SessionManager<br/>会话管理器"]
            PresenceManager["PresenceManager<br/>在线状态管理"]
            StateSnapshot["StateSnapshot<br/>状态快照"]
        end
        
        %% Auth & Security
        subgraph AuthLayer["**Auth 层**"]
            AuthManager["AuthManager<br/>认证管理器"]
            TokenValidator["TokenValidator<br/>Token 验证器"]
            PairingManager["PairingManager<br/>配对管理器"]
            DeviceAuthStore["DeviceAuthStore<br/>设备认证存储"]
        end
        
        %% Business Logic
        subgraph LogicLayer["**业务逻辑层**"]
            AgentService["AgentService<br/>Agent 服务"]
            SendService["SendService<br/>发送服务"]
            ChannelService["ChannelService<br/>频道服务"]
            ConfigService["ConfigService<br/>配置服务"]
            SystemService["SystemService<br/>系统服务"]
        end
        
        %% Gateway Protocol Handlers
        subgraph ProtocolHandlers["**协议处理器**"]
            ConnectHandler["ConnectHandler<br/>连接处理器"]
            HealthHandler["HealthHandler<br/>健康检查处理器"]
            AgentHandler["AgentHandler<br/>Agent 处理器"]
            SendHandler["SendHandler<br/>发送处理器"]
            ConfigHandler["ConfigHandler<br/>配置处理器"]
            ChannelHandler["ChannelHandler<br/>频道处理器"]
        end
        
        %% Data Stores (Internal)
        subgraph InternalStores["**内部存储**"]
            ConfigCache["ConfigCache<br/>配置缓存"]
            SessionCache["SessionCache<br/>会话缓存"]
            MessageQueue["MessageQueue<br/>消息队列"]
        end
    end
    
    %% External Data Stores
    ConfigFile[("Config File<br/>~/.openclaw/config.json")]
    SessionDir[("Session Dir<br/>~/.openclaw/sessions/")]
    CredentialDir[("Credential Dir<br/>~/.openclaw/credentials/")]
    
    %% Connections - External to Gateway
    WSClients <-->|WebSocket| WSServer
    Nodes <-->|WebSocket| WSServer
    Channels <-->|Internal API| ChannelService
    PiAgent <-->|RPC| AgentService
    
    %% Internal Connections - WebSocket Layer
    WSServer <--> ConnectionManager
    ConnectionManager <--> HeartbeatHandler
    ConnectionManager <--> MessageParser
    
    %% Internal Connections - Protocol Layer
    MessageParser --> SchemaValidator
    SchemaValidator --> MethodRouter
    MethodRouter --> ProtocolHandlers
    
    %% Internal Connections - Session Layer
    SessionManager <--> PresenceManager
    SessionManager <--> StateSnapshot
    PresenceManager <--> ConnectionManager
    
    %% Internal Connections - Auth Layer
    AuthManager --> TokenValidator
    AuthManager --> PairingManager
    AuthManager --> DeviceAuthStore
    PairingManager --> ConnectionManager
    
    %% Internal Connections - Business Logic
    ProtocolHandlers --> LogicLayer
    AgentService --> PiAgent
    SendService --> ChannelService
    ChannelService --> Channels
    ConfigService --> ConfigCache
    SystemService --> SessionManager
    
    %% Internal Connections - Protocol Handlers
    ConnectHandler --> AuthManager
    HealthHandler --> SystemService
    AgentHandler --> AgentService
    SendHandler --> SendService
    ConfigHandler --> ConfigService
    ChannelHandler --> ChannelService
    
    %% Internal Data Store Connections
    ConfigCache --> ConfigFile
    SessionCache --> SessionDir
    DeviceAuthStore --> CredentialDir
    MessageQueue --> SessionCache
    
    %% Style Definitions
    classDef external fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef gateway fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef layer fill:#f3e5f5,stroke:#4a148c,stroke-width:1px
    classDef store fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    
    class WSClients,Nodes,Channels,PiAgent external
    class Gateway gateway
    class WSLayer,ProtocolLayer,SessionLayer,AuthLayer,LogicLayer,ProtocolHandlers,InternalStores layer
    class ConfigFile,SessionDir,CredentialDir store
```


## 组件说明

### 1. WebSocket 层 (WebSocket Layer)
- **WebSocketServer**: 基于 ws 库的 WebSocket 服务器，处理所有入站连接
- **ConnectionManager**: 管理客户端连接生命周期，维护连接状态表
- **HeartbeatHandler**: 处理心跳检测，检测断开的连接

### 2. 协议层 (Protocol Layer)
- **MessageParser**: 解析 JSON 消息，提取消息结构
- **SchemaValidator**: 使用 TypeBox 验证消息格式是否符合协议规范
- **MethodRouter**: 根据 method 字段路由到对应的协议处理器

### 3. 会话层 (Session Layer)
- **SessionManager**: 管理用户会话状态，包括会话创建、销毁、恢复
- **PresenceManager**: 管理在线状态，追踪用户活跃状态
- **StateSnapshot**: 维护和分发状态快照

### 4. 认证层 (Auth Layer)
- **AuthManager**: 认证管理器，协调认证流程
- **TokenValidator**: 验证 Token 有效性
- **PairingManager**: 处理设备配对流程
- **DeviceAuthStore**: 存储设备认证信息

### 5. 业务逻辑层 (Business Logic Layer)
- **AgentService**: Agent 服务，协调 AI Agent 调用
- **SendService**: 发送服务，处理消息发送逻辑
- **ChannelService**: 频道服务，管理频道连接和状态
- **ConfigService**: 配置服务，管理配置读写
- **SystemService**: 系统服务，提供系统级功能

### 6. 协议处理器 (Protocol Handlers)
- **ConnectHandler**: 处理连接请求
- **HealthHandler**: 处理健康检查
- **AgentHandler**: 处理 Agent 相关请求
- **SendHandler**: 处理发送消息请求
- **ConfigHandler**: 处理配置请求
- **ChannelHandler**: 处理频道相关请求

### 7. 数据存储
- **Config Cache**: 配置缓存，加速配置读取
- **Session Cache**: 会话缓存，维护会话状态
- **Message Queue**: 消息队列，异步处理消息
- **Config File**: 配置文件，持久化配置 (~/.openclaw/config.json)
- **Session Directory**: 会话目录，存储会话数据 (~/.openclaw/sessions/)
- **Credential Directory**: 凭证目录，存储认证凭证 (~/.openclaw/credentials/)
