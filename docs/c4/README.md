# OpenClaw C4 架构图

本文档使用 [C4 Model](https://c4model.com/) 方法描述 OpenClaw 的架构。

## 文件结构

| 文件                                                                 | 级别                     | 描述                                             |
| -------------------------------------------------------------------- | ------------------------ | ------------------------------------------------ |
| [level1-context.md](./level1-context.md)                             | Level 1 - System Context | 系统上下文图，展示 OpenClaw 与外部系统的交互关系 |
| [level2-container.md](./level2-container.md)                         | Level 2 - Container      | 容器图，展示 OpenClaw 内部的主要容器/应用        |
| [level3-component-gateway.md](./level3-component-gateway.md)         | Level 3 - Component      | 组件图 - Gateway 详细设计                        |
| [level3-component-agent.md](./level3-component-agent.md)             | Level 3 - Component      | 组件图 - Agent 运行时详细设计                    |
| [level3-component-channels.md](./level3-component-channels.md)       | Level 3 - Component      | 组件图 - Channels 子系统详细设计                 |
| [level3-component-android-app.md](./level3-component-android-app.md) | Level 3 - Component      | 组件图 - Android App 详细设计                    |
| [level3-component-i18n.md](./level3-component-i18n.md)               | Level 3 - Component      | 组件图 - 国际化 (i18n) 子系统详细设计            |

## 国际化 (i18n) 子系统

OpenClaw 提供了完整的国际化支持，包括：

### 1. UI 国际化 (`ui/src/i18n/`)

- 基于 Lit 组件的语言切换器 (`<language-switcher>`)
- 翻译文本组件 (`<t-text>`)
- 支持英文 (en) 和中文 (zh)
- 自动语言检测 (浏览器设置)
- localStorage 持久化

### 2. CLI 国际化 (`src/cli/i18n/`)

- 命令行工具翻译支持
- 环境变量语言检测 (`LANG`, `OPENCLAW_LANG`)
- 配置文件存储语言偏好
- 嵌套键支持 (`commands.gateway.description`)

### 3. TUI 国际化 (`src/tui/i18n/`)

- 终端界面翻译
- 中文宽度计算 (CJK 字符 = 2 宽度)
- 实时语言切换
- 动态布局适配

## C4 Model 简介

C4 Model 是一种分层的方法来描述软件架构，由 Simon Brown 创建。它将架构图分为四个层次：

### Level 1: System Context (系统上下文)

- **范围**: 整个系统
- **目标读者**: 所有人，包括非技术人员
- **内容**: 系统与外部用户和系统的交互关系

### Level 2: Container (容器)

- **范围**: 系统内部
- **目标读者**: 技术人员
- **内容**: 系统的主要容器/应用及其关系
- **注意**: "容器"指的是独立运行/部署的单元，不一定是 Docker 容器

### Level 3: Component (组件)

- **范围**: 单个容器内部
- **目标读者**: 开发者
- **内容**: 容器的内部结构和组件

### Level 4: Code (代码)

- **范围**: 单个组件
- **目标读者**: 开发者
- **内容**: 实际的代码实现（通常使用 UML 类图）
- **注意**: 本文档不提供 Level 4 图，建议直接阅读源代码

## 阅读建议

1. **新用户**: 从 [Level 1 - System Context](./level1-context.md) 开始，了解 OpenClaw 是什么以及它与外部系统的交互

2. **架构师/技术负责人**: 阅读 [Level 2 - Container](./level2-container.md)，了解 OpenClaw 的整体架构和主要组件

3. **开发者**: 根据需要阅读 Level 3 的组件图：
   - 如果你在做 Gateway 相关工作，看 [Gateway Component](./level3-component-gateway.md)
   - 如果你在做 Agent 相关工作，看 [Agent Component](./level3-component-agent.md)
   - 如果你在做 Channels 相关工作，看 [Channels Component](./level3-component-channels.md)
   - 如果你在做国际化相关工作，看 [i18n Component](./level3-component-i18n.md)

## 使用 Mermaid 渲染

本文档中的图表使用 [Mermaid](https://mermaid.js.org/) 语法编写。你可以在以下地方查看渲染后的图表：

1. **VS Code**: 安装 Markdown Preview Mermaid Support 插件
2. **GitHub/GitLab**: 直接支持渲染 Mermaid 图表
3. **Mermaid Live Editor**: 访问 https://mermaid.live/ 粘贴代码查看

## 架构决策记录 (ADR)

重要的架构决策：

1. **Gateway 作为单一控制中心**: 所有消息和请求都通过 Gateway 处理，确保一致性和可控性

2. **WebSocket 作为主要传输**: 使用 WebSocket 提供双向实时通信，优于轮询方案

3. **Agent 与 Gateway 分离**: Agent 运行时可以独立于 Gateway 运行，支持不同的部署模式

4. **Channels 插件化架构**: 每个消息平台作为独立的适配器实现，统一接口

5. **配置分层**: 支持系统默认、用户配置、环境变量、命令行参数多层配置覆盖

6. **国际化统一架构**: UI、CLI、TUI 三个界面共享相同的 i18n 核心设计，但针对各自环境有专门优化

## 贡献

如果你发现架构图与代码实现不符，或者有任何改进建议，欢迎提交 PR。

## 许可证

本文档与 OpenClaw 项目使用相同的 MIT 许可证。
