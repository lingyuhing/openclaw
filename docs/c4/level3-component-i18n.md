# OpenClaw C4 Model - Level 3: i18n Internationalization Component

## 国际化 (i18n) 子系统组件图

```mermaid
flowchart TB
    subgraph "UI Layer"
        UI[Web UI<br/>Lit Components]
        LangSwitcher[Language Switcher<br/>Dropdown Component]
        TText[T-Text Component<br/>Translation Text]
        UIDetector[Browser Language Detector<br/>Navigator API]
        UIStorage[LocalStorage Manager<br/>Persistence]
    end

    subgraph "CLI Layer"
        CLI[CLI Commands<br/>Commander.js]
        CLIDetector[Env Language Detector<br/>LANG/OpenClaw_LANG]
        CLIStorage[File Storage Manager<br/>~/.config/openclaw/]
    end

    subgraph "TUI Layer"
        TUI[TUI Application<br/>Blessed]
        TUIAdapter[UI Adapter<br/>Layout Adapter]
        TextUtils[Text Width Utils<br/>CJK Width Calc]
        HotReload[Language Hot Reload<br/>Real-time Switch]
    end

    subgraph "Core i18n Framework"
        Core[I18nCore<br/>Translation Engine]
        Loader[Translation Loader<br/>JSON File Loader]
        Interpolator[Interpolator<br/>{{variable}} Support]
        Utils[Utils<br/>Flatten/Helper Functions]
    end

    subgraph "Translation Resources"
        EN[en.json<br/>English Translations]
        ZH[zh.json<br/>Chinese Translations]
        Locales[Locale Directory<br/>ui/public/i18n/]
    end

    %% UI Layer Connections
    UI --> LangSwitcher
    UI --> TText
    LangSwitcher --> Core
    TText --> Core
    UIDetector --> Core
    UIStorage --> Core

    %% CLI Layer Connections
    CLI --> Core
    CLIDetector --> Core
    CLIStorage --> Core

    %% TUI Layer Connections
    TUI --> TUIAdapter
    TUIAdapter --> Core
    TUI --> TextUtils
    TUI --> HotReload
    HotReload --> Core

    %% Core Connections
    Core --> Loader
    Core --> Interpolator
    Core --> Utils
    Loader --> Locales
    Locales --> EN
    Locales --> ZH
```

## 组件说明

### UI Layer (Web UI)

| 组件                          | 描述                                     | 文件位置                                      |
| ----------------------------- | ---------------------------------------- | --------------------------------------------- |
| **Language Switcher**         | 语言切换下拉组件，支持点击切换语言       | `ui/src/i18n/components/language-switcher.ts` |
| **T-Text**                    | 翻译文本组件，自动根据当前语言翻译内容   | `ui/src/i18n/components/t-text.ts`            |
| **Browser Language Detector** | 检测浏览器语言设置，自动选择最佳匹配语言 | `ui/src/i18n/detector.ts`                     |
| **LocalStorage Manager**      | 将语言偏好持久化到 localStorage          | `ui/src/i18n/storage.ts`                      |

### CLI Layer (命令行)

| 组件                      | 描述                                              | 文件位置               |
| ------------------------- | ------------------------------------------------- | ---------------------- |
| **Env Language Detector** | 检测 `LANG` 或 `OPENCLAW_LANG` 环境变量           | `src/cli/i18n/core.ts` |
| **File Storage Manager**  | 将语言偏好保存到 `~/.config/openclaw/config.json` | `src/cli/i18n/core.ts` |

### TUI Layer (终端界面)

| 组件                    | 描述                                                 | 文件位置                     |
| ----------------------- | ---------------------------------------------------- | ---------------------------- |
| **UI Adapter**          | 适配 blessed UI 组件，支持动态语言切换               | `src/tui/i18n/ui-adapter.ts` |
| **Text Width Utils**    | 计算文本显示宽度，正确处理 CJK 字符（中文 = 2 宽度） | `src/tui/i18n/text-utils.ts` |
| **Language Hot Reload** | 支持运行时切换语言，实时刷新界面                     | `src/tui/i18n/hot-reload.ts` |

### Core i18n Framework (核心框架)

| 组件                   | 描述                                   | 文件位置                                                                     |
| ---------------------- | -------------------------------------- | ---------------------------------------------------------------------------- |
| **I18nCore**           | 核心翻译引擎，提供 `t()` 翻译方法      | `ui/src/i18n/i18n-core.ts` / `src/cli/i18n/core.ts` / `src/tui/i18n/core.ts` |
| **Translation Loader** | 加载 JSON 翻译文件                     | `ui/src/i18n/loader.ts`                                                      |
| **Interpolator**       | 处理 `{{variable}}` 参数插值           | `ui/src/i18n/utils.ts`                                                       |
| **Utils**              | 工具函数（扁平化嵌套对象、语言匹配等） | `ui/src/i18n/utils.ts`                                                       |

### Translation Resources (翻译资源)

| 文件        | 描述     | 位置                                                                                       |
| ----------- | -------- | ------------------------------------------------------------------------------------------ |
| **en.json** | 英文翻译 | `ui/public/i18n/en.json` / `src/cli/i18n/locales/en.json` / `src/tui/i18n/locales/en.json` |
| **zh.json** | 中文翻译 | `ui/public/i18n/zh.json` / `src/cli/i18n/locales/zh.json` / `src/tui/i18n/locales/zh.json` |

## 使用示例

### UI 层

```typescript
// 初始化
import { initI18n, getI18n } from './i18n/index.js';
await initI18n();
const i18n = getI18n();

// 翻译
const text = i18n.t('common.save'); // "Save" / "保存"
const welcome = i18n.t('common.welcome', { name: 'John' }); // "Welcome, John!"

// HTML 组件
<language-switcher></language-switcher>
<t-text key="nav.chat"></t-text>
```

### CLI 层

```typescript
import { initCliI18n, t } from "./i18n/index.js";
await initCliI18n();

// 翻译
console.log(t("commands.gateway.description"));
// Output: "Gateway controls" / "网关控制"

console.log(t("common.errors.invalid_argument", { argument: "port" }));
// Output: "Invalid argument: port" / "无效参数：port"
```

### TUI 层

```typescript
import { initTuiI18n, t, getTextWidth, truncateText } from "./i18n/index.js";
await initTuiI18n();

// 获取翻译
const label = t("ui.chat.input_placeholder");
// "Type a message..." / "输入消息..."

// 计算显示宽度（中文按2计算）
const width = getTextWidth("中文"); // 4

// 截断文本适应列宽
const truncated = truncateText("这是一个很长的消息", 10);
// "这是一个..."
```

## 架构决策

1. **统一的 i18n 核心设计**: UI、CLI、TUI 三个界面共享相同的 i18n 架构模式，降低学习成本

2. **环境特定的优化**:
   - UI: 使用 localStorage，支持浏览器语言自动检测
   - CLI: 使用环境变量，支持文件存储配置
   - TUI: 支持 CJK 字符宽度计算，实现热切换

3. **零依赖设计**: 不使用 i18next 等第三方库，保持轻量级

4. **一致的 API**: 三个环境的 `t()` 翻译函数用法完全一致

5. **翻译文件共享**: 考虑在未来让三个界面共享相同的翻译文件，减少维护成本
