# i18n 国际化系统

OpenClaw UI 的国际化 (i18n) 系统，基于 C4 模型设计实现。

## 特性

- **多语言支持**: 英文 (en) 和中文 (zh)
- **自动语言检测**: 基于浏览器设置
- **持久化**: 使用 localStorage 保存用户偏好
- **按需加载**: 翻译文件异步加载
- **Lit 集成**: 提供 `language-switcher` 和 `t-text` 组件

## 目录结构

```
ui/src/i18n/
├── types.ts                    # TypeScript 类型定义
├── i18n-core.ts               # 核心翻译引擎
├── loader.ts                  # 翻译文件加载器
├── detector.ts                # 语言检测器
├── storage.ts                 # 存储管理器
├── utils.ts                   # 工具函数
├── index.ts                   # 主入口
└── components/
    ├── language-switcher.ts   # 语言切换组件
    └── t-text.ts              # 翻译文本组件

ui/public/i18n/
├── en.json                    # 英文翻译
└── zh.json                    # 中文翻译
```

## 快速开始

### 1. 初始化 i18n 系统

```typescript
import { initI18n, getI18n } from "./i18n/index.js";

// 初始化
await initI18n({
  defaultLang: "en",
  supportedLangs: ["en", "zh"],
  storageKey: "i18n-lang",
  baseUrl: "/i18n",
});

// 获取实例
const i18n = getI18n();
```

### 2. 翻译文本

```typescript
// 简单翻译
const text = i18n.t("common.save"); // "Save"

// 带参数
const welcome = i18n.t("common.welcome", { name: "John" });
// "Welcome, John!"
```

### 3. 切换语言

```typescript
await i18n.setLanguage("zh");
```

### 4. 监听语言变化

```typescript
const unsubscribe = i18n.onLanguageChange((lang) => {
  console.log("Language changed to:", lang);
});

// 取消监听
unsubscribe();
```

## 使用组件

### Language Switcher (语言切换器)

```html
<!-- 基本用法 -->
<language-switcher></language-switcher>

<!-- 传递 i18n 实例 -->
<language-switcher .i18n="${i18nInstance}"></language-switcher>
```

### T-Text (翻译文本)

```html
<!-- 基本用法 -->
<t-text key="common.save"></t-text>

<!-- 带参数 -->
<t-text key="common.welcome" .params=${{ name: "John" }}></t-text>

<!-- 自定义标签 -->
<t-text key="nav.chat" tag="span" class="nav-label"></t-text>
```

## 翻译文件格式

```json
{
  "app": {
    "title": "OpenClaw Control UI",
    "loading": "Loading..."
  },
  "nav": {
    "chat": "Chat",
    "config": "Configuration"
  },
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "welcome": "Welcome, {{name}}!"
  }
}
```

## API 参考

### I18nCore 接口

| 方法                         | 描述         |
| ---------------------------- | ------------ |
| `t(key, params?)`            | 翻译文本     |
| `setLanguage(lang)`          | 切换语言     |
| `onLanguageChange(callback)` | 监听语言变化 |
| `currentLang`                | 获取当前语言 |

### 配置选项

| 选项             | 类型     | 默认值       | 描述              |
| ---------------- | -------- | ------------ | ----------------- |
| `defaultLang`    | string   | "en"         | 默认语言          |
| `supportedLangs` | string[] | ["en", "zh"] | 支持的语言列表    |
| `storageKey`     | string   | "i18n-lang"  | localStorage 键名 |
| `baseUrl`        | string   | "/i18n"      | 翻译文件基础路径  |

## 贡献

添加新语言：

1. 在 `ui/public/i18n/` 创建新的 JSON 文件 (如 `ja.json`)
2. 在配置中添加新语言代码
3. 更新 LanguageSwitcher 的语言列表
