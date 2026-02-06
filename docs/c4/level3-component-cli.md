# OpenClaw C4 Model - Level 3: CLI Component Diagram

## CLI 组件图

```mermaid
flowchart TB
    %% External Systems
    Users(["用户"])
    Gateway["Gateway 网关"]
    ConfigStore[("配置存储<br/>~/.openclaw/")]
    
    %% CLI System Boundary
    subgraph CLISystem["**OpenClaw CLI 系统**"]
        direction TB
        
        %% Entry Layer
        subgraph EntryLayer["**入口层**"]
            CLIEntry["CLI Entry<br/>openclaw.mjs"]
            CommandRegistrar["CommandRegistrar<br/>命令注册器"]
            ArgParser["ArgParser<br/>参数解析器<br/>Commander.js"]
            HelpGenerator["HelpGenerator<br/>帮助生成器"]
        end
        
        %% Core Commands
        subgraph CoreCommands["**核心命令**"]
            direction TB
            
            %% Gateway Command
            subgraph GatewayCmd["**Gateway 命令**"]
                GatewayStart["gateway start<br/>启动网关"]
                GatewayStop["gateway stop<br/>停止网关"]
                GatewayStatus["gateway status<br/>查看状态"]
                GatewayLogs["gateway logs<br/>查看日志"]
                GatewayConfig["gateway config<br/>配置管理"]
            end
            
            %% Agent Command
            subgraph AgentCmd["**Agent 命令**"]
                AgentSend["agent --message<br/>发送消息"]
                AgentRun["agent run<br/>运行 Agent"]
                AgentStatus["agent status<br/>查看状态"]
            end
            
            %% Channels Command
            subgraph ChannelsCmd["**Channels 命令**"]
                ChannelsList["channels list<br/>列出频道"]
                ChannelsAdd["channels add<br/>添加频道"]
                ChannelsRemove["channels remove<br/>移除频道"]
                ChannelsStatus["channels status<br/>频道状态"]
                ChannelsLogin["channels login<br/>登录频道"]
            end
            
            %% Config Command
            subgraph ConfigCmd["**Config 命令**"]
                ConfigGet["config get<br/>获取配置"]
                ConfigSet["config set<br/>设置配置"]
                ConfigList["config list<br/>列出配置"]
                ConfigValidate["config validate<br/>验证配置"]
            end
            
            %% Additional Commands
            subgraph OtherCmd["**其他命令**"]
                OnboardCmd["onboard<br/>引导向导"]
                DoctorCmd["doctor<br/>诊断修复"]
                StatusCmd["status<br/>系统状态"]
                CronCmd["cron<br/>定时任务"]
                MessageCmd["message<br/>消息管理"]
                NodeCmd["node<br/>节点管理"]
                PairingCmd["pairing<br/>配对管理"]
                PluginCmd["plugins<br/>插件管理"]
                SessionCmd["sessions<br/>会话管理"]
                SkillsCmd["skills<br/>技能管理"]
                WebhookCmd["webhooks<br/>Webhook 管理"]
            end
        end
        
        %% Service Layer
        subgraph ServiceLayer["**服务层**"]
            GatewayClient["GatewayClient<br/>网关客户端"]
            ConfigService["ConfigService<br/>配置服务"]
            ChannelService["ChannelService<br/>频道服务"]
            SessionService["SessionService<br/>会话服务"]
            LogService["LogService<br/>日志服务"]
            ProgressService["ProgressService<br/>进度服务"]
        end
        
        %% Utility Layer
        subgraph UtilityLayer["**工具层**"]
            ConfigLoader["ConfigLoader<br/>配置加载器"]
            TokenManager["TokenManager<br/>Token 管理"]
            OutputFormatter["OutputFormatter<br/>输出格式化"]
            PromptHelper["PromptHelper<br/>提示助手"]
            SpinnerManager["SpinnerManager<br/>加载动画"]
            TableRenderer["TableRenderer<br/>表格渲染"]
        end
    end
    
    %% Connections - External to CLI
    Users -->|执行命令| CLIEntry
    Gateway <-->|WebSocket| GatewayClient
    ConfigStore <-->|读写| ConfigLoader
    
    %% Internal Connections - Entry Layer
    CLIEntry --> CommandRegistrar
    CommandRegistrar --> ArgParser
    ArgParser --> CoreCommands
    ArgParser --> HelpGenerator
    HelpGenerator --> Users
    
    %% Internal Connections - Commands to Service Layer
    GatewayCmd --> GatewayClient
    AgentCmd --> GatewayClient
    ChannelsCmd --> ChannelService
    ConfigCmd --> ConfigService
    OtherCmd --> ServiceLayer
    
    %% Internal Connections - Service Layer
    GatewayClient --> ProtocolHandler
    ConfigService --> ConfigLoader
    ChannelService --> GatewayClient
    SessionService --> GatewayClient
    LogService --> OutputFormatter
    ProgressService --> SpinnerManager
    
    %% Internal Connections - Service to Utility
    ConfigService --> TokenManager
    LogService --> TableRenderer
    GatewayClient --> PromptHelper
    
    %% Internal Connections - Commands flow
    GatewayCmd -->|启动/停止| Gateway
    ChannelsCmd -->|配置| ChannelsList
    
    %% Style Definitions
    classDef external fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef cli fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef layer fill:#f3e5f5,stroke:#4a148c,stroke-width:1px
    classDef command fill:#e8f5e9,stroke:#1b5e20,stroke-width:1px
    classDef service fill:#fce4ec,stroke:#880e4f,stroke-width:1px
    
    class Users,Gateway,ConfigStore,WhatsApp,Telegram,Slack,Discord,Signal,IMessage external
    class CLISystem cli
    class EntryLayer,CoreCommands,ServiceLayer,UtilityLayer layer
    class GatewayCmd,AgentCmd,ChannelsCmd,ConfigCmd,OtherCmd command
    class GatewayClient,ConfigService,ChannelService,SessionService,LogService,ProgressService service
```

## 组件说明

### 入口层 (Entry Layer)
- **CLI Entry**: CLI 入口点，处理启动逻辑
- **Command Registrar**: 注册所有可用的命令
- **Arg Parser**: 基于 Commander.js 解析命令行参数
- **Help Generator**: 生成帮助文档

### 核心命令 (Core Commands)

#### Gateway 命令
管理 Gateway 生命周期的命令组:
- `gateway start`: 启动 Gateway 服务
- `gateway stop`: 停止 Gateway 服务
- `gateway status`: 查看 Gateway 状态
- `gateway logs`: 查看 Gateway 日志
- `gateway config`: 管理 Gateway 配置

#### Agent 命令
与 Agent 交互的命令组:
- `agent --message`: 发送消息给 Agent
- `agent run`: 运行 Agent
- `agent status`: 查看 Agent 状态

#### Channels 命令
管理频道的命令组:
- `channels list`: 列出所有频道
- `channels add`: 添加新频道
- `channels remove`: 移除频道
- `channels status`: 查看频道状态
- `channels login`: 登录到频道

#### Config 命令
管理配置的命令组:
- `config get`: 获取配置值
- `config set`: 设置配置值
- `config list`: 列出所有配置
- `config validate`: 验证配置

#### 其他命令
- `onboard`: 引导向导，帮助新用户设置
- `doctor`: 诊断和修复系统问题
- `status`: 查看系统整体状态
- `cron`: 管理定时任务
- `message`: 发送和管理消息
- `node`: 管理节点
- `pairing`: 管理设备配对
- `plugins`: 管理插件
- `sessions`: 管理会话
- `skills`: 管理技能
- `webhooks`: 管理 Webhooks

### 服务层 (Service Layer)
- **GatewayClient**: 与 Gateway 建立 WebSocket 连接的客户端
- **ConfigService**: 配置管理服务，读写配置文件
- **ChannelService**: 频道服务，管理频道配置和状态
- **SessionService**: 会话服务，管理 CLI 会话
- **LogService**: 日志服务，处理和格式化日志输出
- **ProgressService**: 进度服务，显示长时间操作的进度

### 工具层 (Utility Layer)
- **ConfigLoader**: 配置加载器，从文件系统加载配置
- **TokenManager**: Token 管理，处理认证 Token
- **OutputFormatter**: 输出格式化，美化命令输出
- **PromptHelper**: 提示助手，交互式提示
- **SpinnerManager**: 加载动画管理
- **TableRenderer**: 表格渲染器，格式化表格输出
