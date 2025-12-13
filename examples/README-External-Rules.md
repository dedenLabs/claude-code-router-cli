# 外部规则功能说明

## 概述

统一路由引擎支持通过 `externalFunction` 条件类型加载外部 JavaScript 文件中的自定义规则。这使得路由系统更加灵活，可以动态加载和执行复杂的业务逻辑。

## 功能特点

1. **动态加载**：运行时动态导入外部 JS 文件
2. **函数执行**：支持调用外部文件中的指定函数
3. **错误处理**：完善的错误捕获和日志记录
4. **安全检查**：验证函数类型和返回值

## 使用方法

### 1. 定义外部规则

在配置文件中，使用 `externalFunction` 条件类型：

```json
{
  "name": "规则名称",
  "condition": {
    "type": "externalFunction",
    "externalFunction": {
      "path": "./path/to/external/rule.js",
      "functionName": "functionName"
    }
  },
  "action": {
    "route": "target-route"
  }
}
```

### 2. 外部规则文件格式

外部 JS 文件需要导出一个或多个函数：

```javascript
// single-function-export.js
function myCondition(context) {
  // 实现你的逻辑
  return true; // 返回布尔值
}

module.exports = {
  myCondition
};
```

或使用 ES6 模块语法：

```javascript
// multi-function-export.js
export function condition1(context) {
  return context.tokenCount > 1000;
}

export function condition2(context) {
  return context.req?.headers?.['x-premium'] === 'true';
}
```

### 3. 上下文参数

外部函数接收一个 `RouteContext` 对象，包含：

- `tokenCount`: Token 数量
- `messages`: 消息数组
- `system`: 系统消息
- `tools`: 工具数组
- `sessionId`: 会话 ID
- `lastUsage`: 上次使用记录
- `log`: 日志对象
- `event`: 事件对象
- `req`: 完整请求对象

## 示例规则

### 1. 用户偏好路由

根据用户邮箱或ID路由到偏好模型：

```javascript
// user-preference.js
const userPreferences = {
  'user@example.com': { provider: 'openai', model: 'gpt-4' },
  'admin@example.com': { provider: 'anthropic', model: 'claude-3' }
};

function checkUserPreference(context) {
  const userEmail = extractUserEmail(context);
  const preference = userPreferences[userEmail];
  return preference !== undefined;
}
```

### 2. 时间路由

根据当前时间路由到不同模型：

```javascript
// time-based.js
function isBusinessHours(context) {
  const hour = new Date().getHours();
  const isWeekday = [1,2,3,4,5].includes(new Date().getDay());
  return isWeekday && hour >= 9 && hour < 18;
}
```

### 3. 复杂条件路由

组合多个条件进行决策：

```javascript
// complex-routing.js
function evaluateComplexCondition(context) {
  const hasCodeTools = checkForCodeTools(context.tools);
  const isComplexTask = analyzeComplexity(context.messages);
  const hasLongContext = context.tokenCount > 10000;

  return hasCodeTools && isComplexTask && hasLongContext;
}
```

## 最佳实践

1. **错误处理**：始终使用 try-catch 包装可能出错的代码
2. **日志记录**：使用 `console.log` 记录调试信息
3. **返回值**：确保返回布尔值，路由系统会自动转换
4. **模块化**：将相关逻辑分组到不同文件
5. **测试**：在生产环境使用前充分测试

## 安全考虑

1. **路径验证**：系统会验证文件路径的合法性
2. **函数检查**：确保导出的是有效函数
3. **执行隔离**：外部函数错误不会影响主路由系统
4. **日志审计**：所有执行都会被记录

## 加载机制

1. 系统在评估规则时动态 `import()` 外部模块
2. 支持相对路径（相对于配置文件）
3. 缓存机制：导入的模块会被 Node.js 缓存
4. 异步支持：外部函数可以是异步的

## 调试技巧

在配置中启用调试模式可以看到详细的外部函数执行日志：

```json
{
  "debug": {
    "enabled": true,
    "logLevel": "debug"
  }
}
```

日志会显示：
- 外部函数路径
- 执行参数
- 返回结果
- 任何错误信息