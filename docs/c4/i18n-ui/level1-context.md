# Level 1: System Context - UI 国际化

## 上下文图

```mermaid
C4Context
    title System Context - UI i18n

    Person(user_cn, "中文用户", "使用中文的用户")
    Person(user_en, "English User", "English speaking user")

    System(openclaw_ui, "OpenClaw UI", "Web-based user interface")
    System(i18n_system, "i18n System", "国际化翻译系统")

    Rel(user_cn, openclaw_ui, "使用", "中文")
    Rel(user_en, openclaw_ui, "使用", "English")
    Rel(openclaw_ui, i18n_system, "获取翻译")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

## 用户故事

### 中文用户

1. 用户访问 OpenClaw UI
2. 浏览器自动检测语言为中文
3. UI 自动显示中文界面
4. 用户可以手动切换到其他语言

### 英文用户

1. 用户访问 OpenClaw UI
2. 浏览器语言为英文
3. UI 显示英文界面（默认）

## 外部依赖

| 系统     | 用途           | 接口                 |
| -------- | -------------- | -------------------- |
| 浏览器   | 语言检测       | `navigator.language` |
| 本地存储 | 语言偏好持久化 | `localStorage`       |

## 关键约束

1. **性能**: 翻译文件按需加载，不阻塞 UI 渲染
2. **兼容性**: 支持所有现代浏览器
3. **可维护性**: 翻译键名清晰，便于管理
