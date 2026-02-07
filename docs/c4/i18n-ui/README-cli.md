# CLI 国际化 C4 模型设计

本文档描述 OpenClaw CLI 国际化（i18n）系统的架构设计。

## 概述

OpenClaw CLI 是一个基于 Node.js 的命令行工具，使用 Commander.js 构建。目前所有文本都是硬编码英文。本文档设计如何将 CLI 国际化，支持中文等多语言。

## 模型层级

- [Level 1: 系统上下文](./level1-context-cli.md)
- [Level 2: 容器视图](./level2-container-cli.md)
- [Level 3: 组件视图](./level3-component-cli.md)

## 技术选型

### i18n 库

| 库               | 优点             | 缺点           | 推荐度     |
| ---------------- | ---------------- | -------------- | ---------- |
| **i18next**      | 功能丰富，生态好 | 稍重           | ⭐⭐⭐⭐⭐ |
| **y18n**         | 轻量，Yargs 内置 | 功能简单       | ⭐⭐⭐     |
| **node-gettext** | GNU gettext 兼容 | 需要编译       | ⭐⭐       |
| **纯 JSON**      | 零依赖           | 功能要自己实现 | ⭐⭐⭐⭐   |

**推荐**: 使用纯 JSON + 自定义加载器，理由：

1. 零额外依赖
2. 完全可控
3. 与 Web UI 的 i18n 架构保持一致

### 翻译文件格式

```yaml
# 目录结构
src/
  cli/
    i18n/
      locales/
        en.json       # 英文（默认）
        zh.json       # 中文简体
        zh-TW.json    # 中文繁体（未来）
      index.ts        # i18n 入口
      loader.ts       # 翻译加载器
      utils.ts        # 工具函数
```

### en.json 示例

```json
{
  "commands": {
    "gateway": {
      "description": "Gateway controls",
      "subcommands": {
        "start": {
          "description": "Start the gateway daemon",
          "options": {
            "port": "Port to bind (default: 18789)"
          }
        },
        "stop": {
          "description": "Stop the gateway daemon"
        },
        "status": {
          "description": "Show gateway status"
        }
      }
    },
    "agent": {
      "description": "Run an agent turn via the Gateway",
      "options": {
        "message": "Message to send to the agent",
        "local": "Use embedded runner instead of Gateway"
      }
    },
    "config": {
      "description": "Configuration management",
      "subcommands": {
        "get": {
          "description": "Get configuration value"
        },
        "set": {
          "description": "Set configuration value"
        },
        "edit": {
          "description": "Edit configuration in editor"
        }
      }
    }
  },
  "common": {
    "errors": {
      "gateway_not_running": "Gateway is not running. Start it with: openclaw gateway start",
      "config_not_found": "Configuration file not found. Run: openclaw setup",
      "invalid_argument": "Invalid argument: {{argument}}"
    },
    "messages": {
      "success": "Success!",
      "loading": "Loading...",
      "done": "Done.",
      "cancelled": "Cancelled."
    },
    "prompts": {
      "confirm": "Are you sure? (y/N)",
      "continue": "Press Enter to continue...",
      "select": "Select an option:"
    }
  },
  "meta": {
    "language": "English",
    "locale": "en"
  }
}
```

### zh.json 示例

```json
{
  "commands": {
    "gateway": {
      "description": "网关控制",
      "subcommands": {
        "start": {
          "description": "启动网关守护进程",
          "options": {
            "port": "绑定的端口（默认：18789）"
          }
        },
        "stop": {
          "description": "停止网关守护进程"
        },
        "status": {
          "description": "显示网关状态"
        }
      }
    },
    "agent": {
      "description": "通过网关运行智能体",
      "options": {
        "message": "发送给智能体的消息",
        "local": "使用嵌入式运行器而不是网关"
      }
    },
    "config": {
      "description": "配置管理",
      "subcommands": {
        "get": {
          "description": "获取配置值"
        },
        "set": {
          "description": "设置配置值"
        },
        "edit": {
          "description": "在编辑器中编辑配置"
        }
      }
    }
  },
  "common": {
    "errors": {
      "gateway_not_running": "网关未运行。使用以下命令启动：openclaw gateway start",
      "config_not_found": "未找到配置文件。运行：openclaw setup",
      "invalid_argument": "无效参数：{{argument}}"
    },
    "messages": {
      "success": "成功！",
      "loading": "加载中...",
      "done": "完成。",
      "cancelled": "已取消。"
    },
    "prompts": {
      "confirm": "确定吗？(y/N)",
      "continue": "按回车键继续...",
      "select": "选择一个选项："
    }
  },
  "meta": {
    "language": "中文",
    "locale": "zh"
  }
}
```

## 实现状态

- [x] C4 模型文档
- [ ] i18n Core 实现
- [ ] CLI 集成
- [ ] 翻译文件
- [ ] 语言检测

## 参考

- [Commander.js](https://github.com/tj/commander.js/)
- [i18next](https://www.i18next.com/)
- [y18n](https://github.com/yargs/y18n)
- [OpenClaw CLI 源码](../../../src/cli/)
