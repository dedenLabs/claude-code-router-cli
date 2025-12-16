# 测试套件文档

## 概述

本项目包含完整的单元测试和集成测试套件，用于确保配置转换逻辑、路由规则评估和UI组件的正确性。这些测试作为回归测试项目，保证逻辑一致性。

## 测试结构

```
tests/
├── README.md                    # 本文档
├── vitest.config.ts            # 测试配置文件
├── unit/                       # 单元测试
│   ├── config-conversion.test.ts      # 配置转换逻辑测试
│   ├── router-evaluation.test.ts      # 路由规则评估测试
│   └── types.test.ts                   # TypeScript类型定义测试
├── integration/                # 集成测试
│   ├── config-file.test.ts            # 配置文件读写测试
│   └── end-to-end.test.ts             # 端到端流程测试
├── ui/                         # UI组件测试
│   └── config-adapter.test.tsx        # UI组件和hooks测试
└── fixtures/                   # 测试固定装置
    ├── legacy-config.json             # Legacy格式配置示例
    ├── unified-config.json            # Unified格式配置示例
    └── test-requests.json             # 测试请求用例
```

## 运行测试

### 安装依赖

```bash
# 安装测试依赖
npm install

# 或单独安装测试相关依赖
npm install --save-dev vitest @vitest/ui @vitest/coverage-v8 @testing-library/react jsdom
```

### 基本测试命令

```bash
# 运行所有测试
npm test

# 监视模式运行测试
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 启动测试UI界面
npm run test:ui
```

### 分组测试命令

```bash
# 只运行单元测试
npm run test:unit

# 只运行集成测试
npm run test:integration

# 只运行UI测试
npm run test:ui:unit
```

### 特定测试文件

```bash
# 运行特定测试文件
npx vitest run tests/unit/config-conversion.test.ts

# 监视特定测试文件
npx vitest tests/unit/config-conversion.test.ts
```

## 测试覆盖范围

### 1. 配置转换测试 (`tests/unit/config-conversion.test.ts`)

**测试内容：**
- Legacy → Unified 格式转换
- Unified → Legacy 格式转换
- 配置规范化处理
- 格式检测函数
- 边界情况和错误处理

**关键测试场景：**
- 长上下文规则转换
- 思考模式规则转换
- 后台模型规则转换
- 网络搜索规则转换
- 规则优先级保持

### 2. 路由评估测试 (`tests/unit/router-evaluation.test.ts`)

**测试内容：**
- 路由规则评估逻辑
- 条件匹配算法
- 优先级处理
- 缓存机制
- 性能优化

**关键测试场景：**
- Token阈值评估
- 字段存在性检查
- 模型包含判断
- 工具存在验证
- 规则优先级排序

### 3. 类型定义测试 (`tests/unit/types.test.ts`)

**测试内容：**
- TypeScript类型验证
- 类型守卫函数
- 联合类型处理
- 接口一致性检查

**关键测试场景：**
- RouteCondition类型验证
- RouteAction类型验证
- RouteRule类型验证
- UnifiedRouterConfig类型验证
- LegacyRouterConfig类型验证

### 4. 配置文件测试 (`tests/integration/config-file.test.ts`)

**测试内容：**
- 配置文件读取
- 配置文件写入
- 文件备份机制
- 错误处理
- 版本兼容性

**关键测试场景：**
- 读取Legacy格式配置
- 读取Unified格式配置
- 自动格式规范化
- 配置备份和恢复
- 文件权限错误处理

### 5. 端到端测试 (`tests/integration/end-to-end.test.ts`)

**测试内容：**
- 完整业务流程测试
- 配置→路由→结果流程
- UI配置同步测试
- 性能和缓存测试
- 规则优先级测试

**关键测试场景：**
- Legacy配置完整流程
- Unified配置完整流程
- 配置格式兼容性
- 错误处理和边界情况
- UI配置同步流程

### 6. UI组件测试 (`tests/ui/config-adapter.test.tsx`)

**测试内容：**
- React组件渲染
- Hook行为验证
- 配置适配器逻辑
- UI交互测试

**关键测试场景：**
- 统一格式检测
- 传统格式检测
- 配置数据适配
- 规则列表渲染
- 配置更新处理

## 测试数据

### Legacy配置示例

```json
{
  "Router": {
    "default": "sonnet,MiniMax-M2",
    "background": "haiku,MiniMax-M2",
    "think": "opus,MiniMax-M2",
    "longContext": "sonnet,MiniMax-M2",
    "longContextThreshold": 60000,
    "webSearch": "sonnet,MiniMax-M2"
  },
  "Providers": []
}
```

### Unified配置示例

```json
{
  "Router": {
    "engine": "unified",
    "defaultRoute": "sonnet,MiniMax-M2",
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
          "route": "sonnet,MiniMax-M2",
          "transformers": [],
          "description": "长上下文路由：基于token阈值选择模型"
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
      "logLevel": "info",
      "logToFile": true,
      "logToConsole": true
    }
  },
  "Providers": []
}
```

## 覆盖率目标

- **行覆盖率：** ≥ 80%
- **分支覆盖率：** ≥ 80%
- **函数覆盖率：** ≥ 80%
- **语句覆盖率：** ≥ 80%

## 持续集成

### GitHub Actions配置示例

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Generate coverage report
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
```

## 故障排除

### 常见问题

1. **测试超时**
   ```bash
   # 增加超时时间
   npx vitest run --testTimeout 30000
   ```

2. **内存不足**
   ```bash
   # 限制并发测试数量
   npx vitest run --threads 2
   ```

3. **覆盖率低**
   ```bash
   # 查看详细覆盖率报告
   npx vitest run --coverage
   ```

### 调试技巧

1. **单个测试调试**
   ```bash
   npx vitest run tests/unit/config-conversion.test.ts -t "应该正确转换Legacy配置"
   ```

2. **输出详细日志**
   ```bash
   npx vitest run --reporter=verbose
   ```

3. **UI调试**
   ```bash
   npm run test:ui
   ```

## 测试最佳实践

1. **测试命名**
   - 使用描述性的测试名称
   - 遵循"应该...的"命名模式

2. **测试结构**
   - 每个测试只测试一个场景
   - 使用适当的setup和teardown

3. **Mock使用**
   - 适当使用模拟对象
   - 避免过度Mock

4. **断言质量**
   - 使用具体的断言
   - 避免过于宽泛的断言

5. **测试数据**
   - 使用真实的数据样本
   - 包含边界情况

## 贡献指南

1. 新功能必须包含测试
2. Bug修复需要添加回归测试
3. 所有测试必须通过才能合并
4. 覆盖率不能低于80%

## 维护说明

- 定期更新测试依赖
- 检查测试的时效性
- 清理无用的测试代码
- 保持测试文档更新