# 统一路由引擎使用指南

## 概述

统一路由引擎是 Claude Code Router 的新功能，它将原有的多种路由模式（默认、后台、思考、长上下文、网络搜索、子代理）统一为基于规则的路由系统。这种设计使得路由决策更加灵活和可扩展。

## 主要特性

1. **统一路由决策** - 基于优先级的规则引擎
2. **向后兼容** - 自动迁移旧配置
3. **灵活的条件系统** - 支持多种条件类型
4. **变量替换** - 支持动态路由值
5. **缓存优化** - 提高路由性能
6. **友好日志** - 清晰的路由决策日志

## 配置格式

### 基本结构

```json
{
  "Router": {
    "engine": "unified",
    "defaultRoute": "openrouter,claude-3.5-sonnet",
    "rules": [...],
    "cache": {...},
    "debug": {...}
  }
}
```

### 规则定义

每个路由规则包含以下部分：

- `name`: 规则名称（唯一）
- `priority`: 优先级（数字越大优先级越高）
- `enabled`: 是否启用（默认true）
- `condition`: 匹配条件
- `action`: 路由动作

## 条件类型

### 1. tokenThreshold - Token阈值
```json
{
  "type": "tokenThreshold",
  "value": 60000,
  "operator": "gt"
}
```
- `operator`: gt（大于）, lt（小于）, eq（等于）

### 2. modelContains - 模型名包含
```json
{
  "type": "modelContains",
  "value": "haiku",
  "operator": "contains"
}
```
- `operator`: contains（包含）, startsWith（开头）, eq（等于）

### 3. toolExists - 工具存在
```json
{
  "type": "toolExists",
  "value": "web_search",
  "operator": "exists"
}
```

### 4. fieldExists - 字段存在
```json
{
  "type": "fieldExists",
  "field": "thinking",
  "operator": "exists"
}
```

### 5. custom - 自定义条件
```json
{
  "type": "custom",
  "customFunction": "directModelMapping"
}
```

## 变量替换

路由动作支持以下变量：

- `${userModel}` - 用户原始指定的模型
- `${subagent}` - 从系统消息提取的子代理模型
- `${mappedModel}` - 将模型名映射到provider,model格式

## 默认规则

系统自动创建以下默认规则（按优先级排序）：

1. **longContext** (优先级100) - Token数超过阈值
2. **subagent** (优先级90) - 检测子代理标记
3. **background** (优先级80) - 检测Haiku模型
4. **webSearch** (优先级70) - 检测网络搜索工具
5. **thinking** (优先级60) - 检测思考模式
6. **directMapping** (优先级50) - 直接模型名映射
7. **userSpecified** (优先级40) - 用户指定provider,model格式

## 配置示例

### 完整配置示例

```json
{
  "Router": {
    "engine": "unified",
    "defaultRoute": "openrouter,claude-3.5-sonnet",
    "rules": [
      {
        "name": "longContext",
        "priority": 100,
        "enabled": true,
        "condition": {
          "type": "tokenThreshold",
          "value": 60000,
          "operator": "gt"
        },
        "action": {
          "route": "gemini,gemini-2.5-pro",
          "transformers": []
        }
      },
      {
        "name": "customRule",
        "priority": 30,
        "enabled": true,
        "condition": {
          "type": "modelContains",
          "value": "gpt-4",
          "operator": "contains"
        },
        "action": {
          "route": "openai,gpt-4-turbo",
          "transformers": ["customTransformer"]
        }
      }
    ],
    "cache": {
      "enabled": true,
      "maxSize": 1000,
      "ttl": 300000
    },
    "debug": {
      "enabled": false,
      "logLevel": "info"
    },
    "contextThreshold": {
      "default": 1000,
      "longContext": 60000
    }
  }
}
```

## 配置迁移

如果您有旧版本的配置，可以使用以下命令自动迁移：

```bash
ccr migrate
```

该命令会：
1. 备份现有配置
2. 自动转换为统一路由格式
3. 生成迁移报告

## 使用场景

### 1. 按Token数自动切换模型
长文档分析时自动使用支持长上下文的模型：

```json
{
  "name": "longDocument",
  "priority": 100,
  "condition": {
    "type": "tokenThreshold",
    "value": 100000,
    "operator": "gt"
  },
  "action": {
    "route": "anthropic,claude-3-opus"
  }
}
```

### 2. 根据工具选择模型
使用网络搜索时切换到特定模型：

```json
{
  "name": "searchEngine",
  "priority": 90,
  "condition": {
    "type": "toolExists",
    "value": "web_search",
    "operator": "exists"
  },
  "action": {
    "route": "perplexity,llama-3-sonar-large-online"
  }
}
```

### 3. 按用户模型直接映射
用户输入模型名时自动映射到正确的provider：

```json
{
  "name": "modelAlias",
  "priority": 50,
  "condition": {
    "type": "custom",
    "customFunction": "directModelMapping"
  },
  "action": {
    "route": "${mappedModel}"
  }
}
```

## 日志输出

启用调试模式可以看到详细的路由决策过程：

```json
{
  "debug": {
    "enabled": true,
    "logLevel": "debug",
    "logToFile": true,
    "logToConsole": true
  }
}
```

日志示例：
```
✨ 请求 "claude-3.5-sonnet" → 路由到 [openrouter/claude-3.5-sonnet] (规则: userSpecified)
✓ GLM思考模式已启用
```

## 性能优化

1. **缓存** - 启用缓存可以避免重复计算
2. **规则顺序** - 将最常用的规则放在前面
3. **条件优化** - 使用简单的条件先过滤

## 故障排查

1. 查看日志文件：`~/.claude-code-router/logs/`
2. 使用 `ccr status` 检查服务状态
3. 验证配置文件语法：使用JSON验证工具
4. 检查规则优先级是否正确

## 最佳实践

1. 为规则使用描述性的名称
2. 合理设置优先级，避免冲突
3. 定期检查和优化规则
4. 保留配置备份
5. 使用版本控制管理配置