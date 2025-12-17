# CLAUDE.md

此文件为 Claude Code 提供指导，帮助其在此代码库中高效工作。

## 🚀 常用命令

### 开发命令
```bash
# 安装依赖
npm install

# 构建项目
npm run build

# 发布新版本
npm run release
```

### CLI 命令
```bash
# 启动路由服务（前台模式，默认）
ccr start

# 后台运行服务
ccr start --background

# 停止服务
ccr stop

# 重启服务
ccr restart

# 查看服务状态
ccr status

# 交互式模型选择
ccr model

# 执行 Claude 命令
ccr code "你的提示词"

# 环境变量配置
eval "$(ccr activate)"

# 配置迁移（v2.0+）
ccr migrate
```

## 🏗️ 代码架构

### 核心模块
- **CLI 层** (`src/cli.ts`): 命令行接口，处理 `start`、`stop`、`code` 等命令
- **服务层** (`src/server.ts`): 基于 `@musistudio/llms` 的 HTTP 服务器
- **路由层** (`src/utils/router.ts`): 统一路由引擎和传统路由逻辑
- **路由引擎** (`src/utils/unified-router.ts`): 基于规则的路由决策系统

### 数据流
1. **请求入口**: `src/index.ts` → 初始化服务 → Fastify 服务器
2. **路由决策**: `src/utils/router.ts` → 统一路由引擎 → 选择 LLM 提供商
3. **响应处理**: 代理到目标提供商 → Stream 处理 → 返回给客户端

### 关键配置
- **配置文件**: `~/.claude-code-router/config.json`
- **示例配置**: `examples/configs/unified-router-example.json`
- **迁移工具**: `src/utils/migrate-config.ts`

## 📁 目录结构

```
src/
├── agents/          # Agent 管理器
├── middleware/      # 中间件（认证等）
├── transformers/    # 数据转换器
├── types/          # TypeScript 类型定义
└── utils/          # 工具函数
    ├── unified-router.ts  # 统一路由引擎
    ├── router.ts         # 路由主逻辑
    └── migrate-config.ts # 配置迁移
```

## 🎯 路由系统

### 统一路由引擎特性
- **规则驱动**: 基于 `RouteRule` 配置的优先级系统
- **条件类型**: `tokenThreshold`、`modelContains`、`toolExists`、`fieldExists`、`custom`、`externalFunction`
- **变量替换**: 支持 `${userModel}`、`${mappedModel}`、`${subagent}` 等
- **缓存机制**: LRU 缓存提升性能

### 规则示例
```json
{
  "name": "长上下文规则",
  "priority": 100,
  "condition": {
    "type": "tokenThreshold",
    "value": 60000,
    "operator": "gt"
  },
  "action": {
    "route": "gemini,gemini-2.5-pro"
  }
}
```

## ⚠️ 重要提醒

1. **不要自动提交代码**: 无论何时，都不要自动创建 git 提交
2. **超级简洁风格**: 偏好极简实现，避免过度工程
3. **向后兼容**: 修改时注意保持与 v1.x 配置格式的兼容性
4. **日志系统**: 路由决策有详细的 info/debug 日志输出
5. **版本同步**: 每次发布新版本后，必须同步更新以下文件中的版本号：
   - `README.md` 第1行：`# Claude Code Router CLI vX.X.X`
   - `package.json`：`"version": "X.X.X"`
   - 发布后在GitHub创建对应的Release标签
   - **Git提交信息要求**：简洁专业，格式为"类型: 简要描述"，内容包含：核心变更 → 具体改进 → 相关文件，避免AI署名和无功能相关内容


### 关键优势
1. **向后兼容**: 老用户使用 `system.1.text` 配置无需修改
2. **技术正确**: 新用户使用 `content` 字段符合 Anthropic API 标准
3. **零破坏**: 现有生产环境配置完全不受影响
4. **智能处理**: 自动优先使用 `content`，备选 `text`

### 验证结果
✅ **所有测试用例通过** (8/8)
✅ **字段兼容正常** - `system.1.text` 路径成功获取 `content` 字段值
✅ **变量替换成功** - `${subagent}` → `opus,MiniMax-M2`
✅ **向后兼容保障** - 老用户配置无需任何修改

### 重要原则
**永远不要破坏现有用户配置** - 这是铁律
- 宁可实现复杂的兼容逻辑，也不让用户被迫修改配置
- 智能处理 > 强制统一
- 用户体验 > 技术洁癖


## 🔧 核心依赖

- **@musistudio/llms**: 核心服务器框架（基于 Fastify）
- **esbuild**: 构建工具
- **tiktoken**: Token 计算
- **lru-cache**: 内存缓存

## 📖 更多信息

- 完整文档: `docs/UNIFIED_ROUTER_GUIDE.md`
- 示例配置: `examples/configs/`
- 博客文章: `blog/zh/` 和 `blog/en/`