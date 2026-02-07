# Level 3: Component View - UI 国际化

## 组件图

```mermaid
C4Component
    title Component View - i18n System

    Person(user, "用户")

    Container_Boundary(ui_app, "UI Application") {
        Component(app_shell, "App Shell", "Lit", "应用外壳，管理布局")
        Component(router, "Router", "Lit Router", "路由管理")
        Component(theme_manager, "Theme Manager", "Lit", "主题/样式管理")

        Component_Boundary(i18n_system, "i18n System") {
            Component(i18n_core, "I18n Core", "TypeScript", "核心翻译逻辑")
            Component(loader, "Translation Loader", "TypeScript", "异步加载翻译文件")
            Component(interpolator, "Interpolator", "TypeScript", "变量插值")
            Component(pluralizer, "Pluralizer", "TypeScript", "复数规则处理")
            Component(detector, "Language Detector", "TypeScript", "语言检测")
            Component(storage, "Storage Manager", "TypeScript", "localStorage 管理")
        }

        Component(nav_bar, "Nav Bar", "Lit", "导航栏组件")
        Component(sidebar, "Sidebar", "Lit", "侧边栏组件")
        Component(chat_view, "Chat View", "Lit", "聊天视图")
        Component(config_view, "Config View", "Lit", "配置视图")
        Component(usage_view, "Usage View", "Lit", "使用量视图")
        Component(nodes_view, "Nodes View", "Lit", "节点视图")
        Component(cron_view, "Cron View", "Lit", "定时任务视图")

        Component(lang_switcher, "Language Switcher", "Lit", "语言切换器")
        Component(translation_text, "T-Text", "Lit", "翻译文本组件")
    }

    Rel(user, app_shell, "使用")
    Rel(app_shell, router, "管理")
    Rel(app_shell, theme_manager, "使用")

    Rel(router, chat_view, "渲染")
    Rel(router, config_view, "渲染")
    Rel(router, usage_view, "渲染")
    Rel(router, nodes_view, "渲染")
    Rel(router, cron_view, "渲染")

    Rel(app_shell, nav_bar, "包含")
    Rel(app_shell, sidebar, "包含")
    Rel(nav_bar, lang_switcher, "包含")

    Rel(chat_view, translation_text, "使用")
    Rel(config_view, translation_text, "使用")

    Rel(i18n_core, loader, "使用")
    Rel(i18n_core, interpolator, "使用")
    Rel(i18n_core, pluralizer, "使用")
    Rel(i18n_core, detector, "使用")
    Rel(i18n_core, storage, "使用")

    Rel(translation_text, i18n_core, "调用 t()")
    Rel(lang_switcher, i18n_core, "切换语言")
    Rel(detector, storage, "检测保存的语言")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="2")
```

## 核心组件详解

### 1. I18n Core (核心翻译引擎)

```typescript
// src/i18n/i18n-core.ts
export interface I18nCore {
  // 当前语言
  readonly currentLang: string;

  // 翻译函数
  t(key: string, params?: Record<string, string | number>): string;

  // 切换语言
  setLanguage(lang: string): Promise<void>;

  // 监听语言变化
  onLanguageChange(callback: (lang: string) => void): void;
}

export class I18nCoreImpl implements I18nCore {
  private _currentLang = "en";
  private translations: Map<string, Record<string, string>> = new Map();
  private listeners: Set<(lang: string) => void> = new Set();

  constructor(
    private loader: TranslationLoader,
    private interpolator: Interpolator,
    private storage: StorageManager,
  ) {}

  get currentLang(): string {
    return this._currentLang;
  }

  async setLanguage(lang: string): Promise<void> {
    if (lang === this._currentLang) return;

    // 加载翻译文件
    if (!this.translations.has(lang)) {
      const translations = await this.loader.load(lang);
      this.translations.set(lang, translations);
    }

    this._currentLang = lang;
    this.storage.set("i18n-lang", lang);

    // 通知监听器
    this.listeners.forEach((cb) => cb(lang));
  }

  t(key: string, params?: Record<string, string | number>): string {
    const translations = this.translations.get(this._currentLang);
    if (!translations) return key;

    let text = translations[key] || key;

    if (params) {
      text = this.interpolator.interpolate(text, params);
    }

    return text;
  }

  onLanguageChange(callback: (lang: string) => void): void {
    this.listeners.add(callback);
  }
}
```

### 2. Language Detector (语言检测器)

```typescript
// src/i18n/detector.ts
export interface LanguageDetector {
  detect(): string;
}

export class BrowserLanguageDetector implements LanguageDetector {
  constructor(
    private storage: StorageManager,
    private supportedLangs: string[] = ["en", "zh"],
  ) {}

  detect(): string {
    // 1. 检查 localStorage
    const saved = this.storage.get("i18n-lang");
    if (saved && this.supportedLangs.includes(saved)) {
      return saved;
    }

    // 2. 检查浏览器语言
    const browserLang = navigator.language.toLowerCase();

    // 中文检测
    if (browserLang.startsWith("zh")) {
      return browserLang.includes("tw") || browserLang.includes("hk") ? "zh-TW" : "zh";
    }

    // 3. 默认英文
    return "en";
  }
}
```

### 3. Translation Loader (翻译文件加载器)

```typescript
// src/i18n/loader.ts
export interface TranslationLoader {
  load(lang: string): Promise<Record<string, string>>;
}

export class HttpTranslationLoader implements TranslationLoader {
  private cache: Map<string, Record<string, string>> = new Map();

  constructor(private baseUrl = "/i18n") {}

  async load(lang: string): Promise<Record<string, string>> {
    // 检查缓存
    if (this.cache.has(lang)) {
      return this.cache.get(lang)!;
    }

    // 加载翻译文件
    const response = await fetch(`${this.baseUrl}/${lang}.json`);

    if (!response.ok) {
      throw new Error(`Failed to load translations for ${lang}`);
    }

    const translations = await response.json();

    // 缓存结果
    this.cache.set(lang, translations);

    return translations;
  }

  // 预加载语言
  preload(lang: string): void {
    this.load(lang).catch(console.error);
  }

  // 清除缓存
  clearCache(): void {
    this.cache.clear();
  }
}
```

### 4. Language Switcher Component (语言切换器)

```typescript
// src/ui/components/language-switcher.ts
import { LitElement, html, css } from "lit";
import { customElement, state } from "lit/decorators.js";
import { i18n } from "../../i18n";

interface Language {
  code: string;
  name: string;
  flag: string;
}

const LANGUAGES: Language[] = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
];

@customElement("language-switcher")
export class LanguageSwitcher extends LitElement {
  static styles = css`
    :host {
      display: inline-block;
    }

    .switcher {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--bg-secondary, #f5f5f5);
      border: 1px solid var(--border-color, #ddd);
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s ease;
    }

    .switcher:hover {
      background: var(--bg-hover, #e9e9e9);
    }

    .flag {
      font-size: 16px;
    }

    .lang-name {
      font-weight: 500;
    }

    .dropdown-arrow {
      margin-left: 4px;
      font-size: 10px;
      opacity: 0.6;
    }

    .dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 4px;
      background: var(--bg-primary, white);
      border: 1px solid var(--border-color, #ddd);
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      min-width: 100%;
      z-index: 1000;
      display: none;
    }

    .dropdown.open {
      display: block;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .dropdown-item:hover {
      background: var(--bg-hover, #f0f0f0);
    }

    .dropdown-item.active {
      background: var(--bg-active, #e3f2fd);
      color: var(--primary-color, #1976d2);
    }
  `;

  @state()
  private isOpen = false;

  @state()
  private currentLang = i18n.currentLang;

  connectedCallback() {
    super.connectedCallback();
    i18n.onLanguageChange((lang) => {
      this.currentLang = lang;
    });
    document.addEventListener("click", this.handleClickOutside);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("click", this.handleClickOutside);
  }

  private handleClickOutside = (e: MouseEvent) => {
    if (!this.contains(e.target as Node)) {
      this.isOpen = false;
    }
  };

  private toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  private async selectLanguage(langCode: string) {
    if (langCode !== this.currentLang) {
      await i18n.setLanguage(langCode);
    }
    this.isOpen = false;
  }

  private getCurrentLanguage(): Language | undefined {
    return LANGUAGES.find((l) => l.code === this.currentLang);
  }

  render() {
    const current = this.getCurrentLanguage();

    return html`
      <div class="switcher" @click="${this.toggleDropdown}">
        <span class="flag">${current?.flag}</span>
        <span class="lang-name">${current?.name}</span>
        <span class="dropdown-arrow">▼</span>
      </div>

      <div class="dropdown ${this.isOpen ? "open" : ""}">
        ${LANGUAGES.map(
          (lang) => html`
            <div
              class="dropdown-item ${lang.code === this.currentLang ? "active" : ""}"
              @click="${() => this.selectLanguage(lang.code)}"
            >
              <span class="flag">${lang.flag}</span>
              <span>${lang.name}</span>
            </div>
          `,
        )}
      </div>
    `;
  }
}

// 注册自定义元素
declare global {
  interface HTMLElementTagNameMap {
    "language-switcher": LanguageSwitcher;
  }
}
```

## 组件交互图

```
┌─────────────────────────────────────────────────────────────┐
│                    UI Application                            │
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐   │
│  │   Views     │    │  Components │    │  Language       │   │
│  │  (Pages)    │◄──►│  (Shared)   │◄──►│  Switcher       │   │
│  └─────────────┘    └─────────────┘    └─────────────────┘   │
│           │                                    │            │
│           │         ┌─────────────────────┐      │            │
│           └────────►│     i18n Core       │◄─────┘            │
│                     │  (Translation API)  │                   │
│                     └─────────────────────┘                   │
│                               │                               │
│           ┌───────────────────┼───────────────────┐            │
│           ▼                   ▼                   ▼            │
│    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│    │   Loader    │    │ Interpolator│    │   Storage   │    │
│    │(Fetch JSON) │    │({{var}})    │    │(localStorage)│    │
│    └─────────────┘    └─────────────┘    └─────────────┘    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## 翻译流程

```
1. 用户访问页面
         │
         ▼
2. i18n Core 初始化
         │
         ├───► Language Detector 检测浏览器语言
         │
         ├───► Storage Manager 检查 localStorage 保存的偏好
         │
         └───► 确定初始语言 (默认: en)
         │
         ▼
3. Translation Loader 异步加载翻译文件
         │
         ├───► GET /i18n/en.json (或 zh.json)
         │
         └───► 缓存翻译内容
         │
         ▼
4. UI 渲染
         │
         ├───► 组件调用 t('key') 或 <t-text key="key">
         │
         └───► Interpolator 处理变量插值
         │
         ▼
5. 用户切换语言
         │
         ├───► 点击 Language Switcher
         │
         ├───► i18n Core.setLanguage('zh')
         │
         ├───► Storage Manager 保存偏好
         │
         └───► 触发所有监听组件重新渲染
```

## 组件职责表

| 组件                   | 职责                           | 关键 API                                     |
| ---------------------- | ------------------------------ | -------------------------------------------- |
| **I18n Core**          | 管理翻译状态，提供 t() 函数    | `t()`, `setLanguage()`, `onLanguageChange()` |
| **Translation Loader** | 异步加载 JSON 翻译文件         | `load()`, `preload()`                        |
| **Interpolator**       | 处理变量插值 `{{variable}}`    | `interpolate()`                              |
| **Pluralizer**         | 处理复数规则（简单场景可跳过） | `pluralize()`                                |
| **Language Detector**  | 检测浏览器/存储的语言偏好      | `detect()`                                   |
| **Storage Manager**    | 管理 localStorage 持久化       | `get()`, `set()`                             |
| **Language Switcher**  | UI 组件，切换语言              | Lit 组件                                     |
| **T-Text**             | 翻译文本展示组件               | Lit 组件，接受 key 属性                      |

## 示例翻译文件

### en.json

```json
{
  "app": {
    "title": "OpenClaw Control UI",
    "loading": "Loading..."
  },
  "nav": {
    "chat": "Chat",
    "config": "Configuration",
    "usage": "Usage",
    "nodes": "Nodes",
    "cron": "Cron Jobs"
  },
  "chat": {
    "placeholder": "Type a message...",
    "send": "Send",
    "clear": "Clear",
    "new_session": "New Session"
  },
  "config": {
    "save": "Save",
    "reset": "Reset",
    "export": "Export",
    "import": "Import"
  },
  "common": {
    "cancel": "Cancel",
    "confirm": "Confirm",
    "close": "Close",
    "yes": "Yes",
    "no": "No",
    "error": "Error",
    "success": "Success",
    "warning": "Warning",
    "info": "Info"
  },
  "language": {
    "current": "Language",
    "en": "English",
    "zh": "中文"
  }
}
```

### zh.json

```json
{
  "app": {
    "title": "OpenClaw 控制面板",
    "loading": "加载中..."
  },
  "nav": {
    "chat": "聊天",
    "config": "配置",
    "usage": "用量",
    "nodes": "节点",
    "cron": "定时任务"
  },
  "chat": {
    "placeholder": "输入消息...",
    "send": "发送",
    "clear": "清空",
    "new_session": "新会话"
  },
  "config": {
    "save": "保存",
    "reset": "重置",
    "export": "导出",
    "import": "导入"
  },
  "common": {
    "cancel": "取消",
    "confirm": "确认",
    "close": "关闭",
    "yes": "是",
    "no": "否",
    "error": "错误",
    "success": "成功",
    "warning": "警告",
    "info": "信息"
  },
  "language": {
    "current": "语言",
    "en": "English",
    "zh": "中文"
  }
}
```

## 实现路线图

### 阶段 1: 基础框架 (MVP)

- [ ] 创建 i18n 核心模块
- [ ] 实现 Translation Loader
- [ ] 实现 Language Detector
- [ ] 实现 Storage Manager
- [ ] 创建基础翻译文件（en + zh）

### 阶段 2: UI 集成

- [ ] 创建 Language Switcher 组件
- [ ] 创建 T-Text 组件
- [ ] 集成到现有视图（Chat, Config, Usage 等）
- [ ] 添加加载状态处理

### 阶段 3: 完善

- [ ] 添加 Pluralizer 支持
- [ ] 实现翻译键自动提取工具
- [ ] 添加翻译完整性检查
- [ ] 性能优化（按需加载、缓存策略）

### 阶段 4: 高级功能

- [ ] 支持更多语言（ja, ko, de, fr 等）
- [ ] 支持 RTL 语言（阿拉伯语、希伯来语）
- [ ] 翻译管理后台
- [ ] 社区贡献翻译流程
