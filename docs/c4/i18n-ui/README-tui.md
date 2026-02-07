# TUI 国际化 C4 模型设计

本文档描述 OpenClaw TUI（终端用户界面）国际化（i18n）系统的架构设计。

## 概述

OpenClaw TUI 是一个基于 `blessed` 库的终端图形界面，运行在命令行中。它提供了比纯 CLI 更丰富的交互体验，包括实时聊天界面、消息渲染、键盘快捷键等。

## 模型层级

- [Level 1: 系统上下文](./level1-context-tui.md)
- [Level 2: 容器视图](./level2-container-tui.md)
- [Level 3: 组件视图](./level3-component-tui.md)

## TUI 特有的国际化挑战

### 1. 终端宽度限制

- 中文字符占 2 个字符宽度，英文占 1 个
- 需要动态计算文本宽度来做截断和填充

### 2. 实时界面更新

- TUI 是实时渲染的，切换语言时需要动态刷新所有组件
- 需要存储原始翻译键，以便重新翻译

### 3. 键盘快捷键

- 快捷键提示需要翻译
- 例如："Press Q to quit" → "按 Q 退出"

### 4. 布局适配

- 中文翻译可能比英文长或短
- 需要动态调整列宽和布局

## 技术选型

### UI 库

- **blessed**: 成熟的 Node.js 终端 UI 库
- **blessed-contrib**: 额外的组件（图表等）

### i18n 方案

与 CLI 和 Web UI 保持一致：

- 纯 JSON 翻译文件
- 自定义轻量级 i18n 核心
- 零额外依赖

### 文件结构

```
src/tui/
  i18n/
    index.ts          # 入口
    core.ts           # 核心翻译逻辑
    loader.ts         # 翻译文件加载
    detector.ts       # 语言检测
    utils.ts          # 工具函数
    ui-adapter.ts     # UI 适配器
    hot-reload.ts     # 热切换
    text-utils.ts     # 文本处理
    locales/
      en.json
      zh.json
  components/         # UI 组件
    chat-box.ts
    input-box.ts
    status-bar.ts
    menu.ts
  app.ts              # 主应用
  index.ts            # 入口
```

## 实现路线图

### 阶段 1: 基础 i18n 框架

- [ ] 创建 TUI i18n 核心模块
- [ ] 实现文本宽度计算工具
- [ ] 创建翻译文件加载器
- [ ] 实现语言检测器

### 阶段 2: 组件国际化

- [ ] 修改所有 UI 组件支持 i18n
- [ ] 存储翻译键以便热切换
- [ ] 实现组件重渲染逻辑

### 阶段 3: 热切换语言

- [ ] 实现语言切换快捷键
- [ ] 实现界面实时刷新
- [ ] 调整布局适配不同语言

### 阶段 4: 完善

- [ ] 完成中文翻译
- [ ] 添加更多语言支持
- [ ] 性能优化
- [ ] 编写文档

## 参考

- [Blessed](https://github.com/chjj/blessed)
- [Blessed-contrib](https://github.com/yaronn/blessed-contrib)
- [Node.js os](https://nodejs.org/api/os.html)
- [Intl.Segmenter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter)
