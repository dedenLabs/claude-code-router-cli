/**
 * 端到端集成测试
 * 测试完整的配置加载→转换→路由决策→结果输出流程
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { normalizeConfig, isUnifiedFormat, isLegacyFormat, convertLegacyToUnified } from '../../src/utils/config-handler';
import { UnifiedRouter } from '../../src/utils/unified-router';
import type { UnifiedRouterConfig, RouteContext, AnyRouterConfig } from '../../src/types/router';

// 测试固定装置路径
const testConfigDir = join(__dirname, '../fixtures');
const testConfigPath = join(testConfigDir, 'e2e-test-config.json');

// 模拟的路由上下文
const createMockRouteContext = (overrides: Partial<RouteContext> = {}): RouteContext => {
  return {
    tokenCount: 1000,
    messages: [],
    system: [],
    tools: [],
    sessionId: 'test-session',
    req: { body: {} },
    log: {
      info: () => {},
      error: () => {},
      warn: () => {},
      debug: () => {}
    },
    ...overrides
  };
};

describe('端到端集成测试', () => {
  beforeEach(() => {
    // 创建测试目录
    if (!existsSync(testConfigDir)) {
      mkdirSync(testConfigDir, { recursive: true });
    }
  });

  afterEach(() => {
    // 清理测试文件
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }
  });

  test('Legacy配置完整流程测试', async () => {
    // 1. 准备Legacy格式配置
    const legacyConfig = {
      Router: {
        default: 'sonnet,MiniMax-M2',
        background: 'haiku,MiniMax-M2',
        think: 'opus,MiniMax-M2',
        longContext: 'sonnet,MiniMax-M2',
        longContextThreshold: 60000,
        webSearch: 'sonnet,MiniMax-M2'
      },
      Providers: [
        {
          name: 'test',
          api_base_url: 'https://api.test.com',
          api_key: 'test-key',
          models: ['model1', 'model2']
        }
      ]
    };

    // 2. 写入测试配置文件
    writeFileSync(testConfigPath, JSON.stringify(legacyConfig, null, 2), 'utf8');

    // 3. 读取配置
    const configData = readFileSync(testConfigPath, 'utf8');
    const loadedConfig = JSON.parse(configData);

    // 4. 验证读取的是Legacy格式
    expect(isLegacyFormat(loadedConfig)).toBe(true);
    expect(isUnifiedFormat(loadedConfig)).toBe(false);

    // 5. 规范化配置（自动转换为Unified格式）
    const normalizedConfig = normalizeConfig(loadedConfig);

    // 6. 验证转换结果
    expect(isUnifiedFormat(normalizedConfig)).toBe(true);
    expect(normalizedConfig.Router.engine).toBe('unified');
    expect(normalizedConfig.Router.defaultRoute).toBe('sonnet,MiniMax-M2');
    expect(Array.isArray(normalizedConfig.Router.rules)).toBe(true);

    // 7. 验证转换后的规则数量和结构
    const rules = normalizedConfig.Router.rules;
    expect(rules.length).toBeGreaterThan(0);

    // 检查长上下文规则
    const longContextRule = rules.find(rule => rule.name === 'longContext');
    expect(longContextRule).toBeDefined();
    expect(longContextRule?.condition.type).toBe('tokenThreshold');
    expect(longContextRule?.condition.operator).toBe('gt');
    expect(longContextRule?.action.route).toBe('sonnet,MiniMax-M2');

    // 检查思考模式规则
    const thinkingRule = rules.find(rule => rule.name === 'thinking');
    expect(thinkingRule).toBeDefined();
    expect(thinkingRule?.condition.type).toBe('fieldExists');
    expect(thinkingRule?.condition.operator).toBe('exists');
    expect(thinkingRule?.action.route).toBe('opus,MiniMax-M2');

    // 检查后台模型规则
    const backgroundRule = rules.find(rule => rule.name === 'background');
    expect(backgroundRule).toBeDefined();
    expect(backgroundRule?.action.route).toBe('haiku,MiniMax-M2');

    // 8. 测试路由决策 - 长上下文场景
    const longContextRequest = createMockRouteContext({
      tokenCount: 70000 // 超过阈值
    });

    const router1 = new UnifiedRouter(normalizedConfig.Router as UnifiedRouterConfig);
    const longContextResult = router1.route(longContextRequest);
    expect(longContextResult.route).toBe('sonnet,MiniMax-M2');

    // 9. 测试路由决策 - 思考模式场景
    const thinkingRequest = createMockRouteContext({
      req: { body: { thinking: { type: 'enabled' } } }
    });

    const router2 = new UnifiedRouter(normalizedConfig.Router as UnifiedRouterConfig);
    const thinkingResult = router2.route(thinkingRequest);
    expect(thinkingResult.route).toBe('opus,MiniMax-M2');

    // 10. 测试路由决策 - 默认场景
    const defaultRequest = createMockRouteContext({
      tokenCount: 1000,
      req: { body: {} }
    });

    const router3 = new UnifiedRouter(normalizedConfig.Router as UnifiedRouterConfig);
    const defaultResult = router3.route(defaultRequest);
    expect(defaultResult.route).toBe('sonnet,MiniMax-M2'); // 应该使用默认路由
  });

  test('Unified配置完整流程测试', async () => {
    // 1. 准备Unified格式配置
    const unifiedConfig = {
      Router: {
        engine: 'unified',
        defaultRoute: 'sonnet,MiniMax-M2',
        rules: [
          {
            name: 'longContext',
            priority: 100,
            enabled: true,
            condition: {
              type: 'tokenThreshold',
              value: 60000,
              operator: 'gt'
            },
            action: {
              route: 'sonnet,MiniMax-M2',
              transformers: [],
              description: '长上下文路由：基于token阈值选择模型'
            }
          },
          {
            name: 'thinking',
            priority: 60,
            enabled: true,
            condition: {
              type: 'fieldExists',
              field: 'thinking',
              operator: 'exists'
            },
            action: {
              route: 'opus,MiniMax-M2',
              transformers: [],
              description: '思考模式路由：检测thinking参数时使用特定模型'
            }
          },
          {
            name: 'background',
            priority: 80,
            enabled: true,
            condition: {
              type: 'modelContains',
              value: 'haiku',
              operator: 'contains'
            },
            action: {
              route: 'haiku,MiniMax-M2',
              transformers: [],
              description: '后台路由：Haiku模型自动使用轻量级模型'
            }
          }
        ],
        cache: {
          enabled: true,
          maxSize: 1000,
          ttl: 300000
        },
        debug: {
          enabled: false,
          logLevel: 'info',
          logToFile: true,
          logToConsole: true
        }
      },
      Providers: []
    };

    // 2. 写入和读取配置
    writeFileSync(testConfigPath, JSON.stringify(unifiedConfig, null, 2), 'utf8');
    const configData = readFileSync(testConfigPath, 'utf8');
    const loadedConfig = JSON.parse(configData);

    // 3. 验证格式检测
    expect(isUnifiedFormat(loadedConfig)).toBe(true);
    expect(isLegacyFormat(loadedConfig)).toBe(false);

    // 4. 规范化配置（应该保持不变）
    const normalizedConfig = normalizeConfig(loadedConfig);
    expect(normalizedConfig).toEqual(loadedConfig);

    // 5. 测试各种路由场景
    const testCases = [
      {
        name: '长上下文场景',
        context: createMockRouteContext({ tokenCount: 70000 }),
        expectedRoute: 'sonnet,MiniMax-M2'
      },
      {
        name: '思考模式场景',
        context: createMockRouteContext({
          req: { body: { thinking: { type: 'enabled' } } }
        }),
        expectedRoute: 'opus,MiniMax-M2'
      },
      {
        name: '默认场景',
        context: createMockRouteContext({ tokenCount: 1000 }),
        expectedRoute: 'sonnet,MiniMax-M2'
      }
    ];

    const router = new UnifiedRouter(normalizedConfig.Router as UnifiedRouterConfig);

    for (const testCase of testCases) {
      const result = router.route(testCase.context);
      expect(result.route).toBe(testCase.expectedRoute, `Failed for: ${testCase.name}`);
    }
  });

  test('配置格式兼容性测试', async () => {
    // 测试从Legacy到Unified的完整转换循环
    const originalLegacy = {
      Router: {
        default: 'test,model',
        background: 'haiku,model',
        think: 'opus,model',
        longContext: 'sonnet,model',
        longContextThreshold: 50000,
        webSearch: 'sonnet,model'
      },
      Providers: []
    };

    // 1. Legacy → Unified
    const unified = convertLegacyToUnified(originalLegacy.Router);
    expect(unified.engine).toBe('unified');
    expect(unified.defaultRoute).toBe('test,model');

    // 2. 验证Unified配置的结构完整性
    expect(unified.rules.length).toBeGreaterThan(0);
    unified.rules.forEach((rule, index) => {
      expect(rule.name).toBeDefined();
      expect(rule.priority).toBeDefined();
      expect(rule.enabled).toBe(true);
      expect(rule.condition).toBeDefined();
      expect(rule.condition.type).toBeDefined();
      expect(rule.action).toBeDefined();
      expect(rule.action.route).toBeDefined();
      expect(rule.action.transformers).toEqual([]);
    });

    // 3. 测试Unified配置的路由决策
    const testContext = createMockRouteContext({ tokenCount: 60000 });
    const router = new UnifiedRouter(unified);
    const result = router.route(testContext);
    expect(result.route).toBe('sonnet,model');
  });

  test('错误处理和边界情况测试', async () => {
    // 1. 测试空配置
    const emptyConfig = {
      Router: {},
      Providers: []
    };

    const normalizedEmpty = normalizeConfig(emptyConfig);
    expect(normalizedEmpty.Router.engine).toBe('unified');
    expect(normalizedEmpty.Router.defaultRoute).toBeDefined();
    expect(Array.isArray(normalizedEmpty.Router.rules)).toBe(true);

    // 2. 测试不完整配置
    const incompleteConfig = {
      Router: {
        default: 'test,model'
        // 缺少其他字段
      },
      Providers: []
    };

    const normalizedIncomplete = normalizeConfig(incompleteConfig);
    expect(normalizedIncomplete.Router.engine).toBe('unified');
    expect(normalizedIncomplete.Router.defaultRoute).toBe('test,model');
    expect(normalizedIncomplete.Router.cache).toBeDefined();
    expect(normalizedIncomplete.Router.debug).toBeDefined();

    // 3. 测试无效的Unified配置修复
    const invalidUnified = {
      Router: {
        engine: 'unified',
        // 缺少 defaultRoute 和 rules
      },
      Providers: []
    };

    const normalizedInvalid = normalizeConfig(invalidUnified);
    expect(normalizedInvalid.Router.defaultRoute).toBeDefined();
    expect(Array.isArray(normalizedInvalid.Router.rules)).toBe(true);
  });

  test('性能和缓存测试', async () => {
    // 1. 测试配置规范化性能
    const largeLegacyConfig = {
      Router: {
        default: 'sonnet,model',
        background: 'haiku,model',
        think: 'opus,model',
        longContext: 'sonnet,model',
        longContextThreshold: 60000,
        webSearch: 'sonnet,model'
      },
      Providers: new Array(100).fill(0).map((_, i) => ({
        name: `provider${i}`,
        models: ['model1', 'model2', 'model3']
      }))
    };

    const startTime = performance.now();
    const normalized = normalizeConfig(largeLegacyConfig);
    const endTime = performance.now();

    // 规范化应该在合理时间内完成（小于100ms）
    expect(endTime - startTime).toBeLessThan(100);
    expect(normalized.Router.engine).toBe('unified');

    // 2. 测试缓存配置
    const configWithCache = {
      Router: {
        engine: 'unified',
        defaultRoute: 'test,model',
        rules: [],
        cache: {
          enabled: true,
          maxSize: 1000,
          ttl: 300000
        }
      },
      Providers: []
    };

    const normalizedWithCache = normalizeConfig(configWithCache);
    expect(normalizedWithCache.Router.cache?.enabled).toBe(true);
    expect(normalizedWithCache.Router.cache?.maxSize).toBe(1000);
  });

  test('UI配置同步测试', async () => {
    // 模拟UI配置更新流程
    const originalConfig = {
      Router: {
        default: 'sonnet,model'
      },
      Providers: []
    };

    // 1. 加载并规范化配置
    const normalizedConfig = normalizeConfig(originalConfig);
    expect(normalizedConfig.Router.engine).toBe('unified');

    // 2. 模拟UI更新默认路由
    const uiUpdate = {
      routerConfig: {
        ...normalizedConfig.Router,
        defaultRoute: 'opus,model'
      }
    };

    const updatedConfig = {
      ...normalizedConfig,
      Router: uiUpdate.routerConfig
    };

    // 3. 验证更新后的配置
    expect(updatedConfig.Router.defaultRoute).toBe('opus,model');
    expect(updatedConfig.Router.engine).toBe('unified');

    // 4. 验证路由决策使用新配置
    const testContext = createMockRouteContext({ tokenCount: 1000 });
    const router = new UnifiedRouter(updatedConfig.Router);
    const result = router.route(testContext);
    expect(result.route).toBe('opus,model');
  });

  test('规则优先级测试', async () => {
    // 创建具有重叠条件的规则来测试优先级
    const configWithOverlappingRules = {
      Router: {
        engine: 'unified',
        defaultRoute: 'default,model',
        rules: [
          {
            name: 'highPriority',
            priority: 100,
            enabled: true,
            condition: {
              type: 'tokenThreshold',
              value: 50000,
              operator: 'gt'
            },
            action: {
              route: 'high,model',
              transformers: [],
              description: '高优先级规则'
            }
          },
          {
            name: 'lowPriority',
            priority: 50,
            enabled: true,
            condition: {
              type: 'tokenThreshold',
              value: 10000,
              operator: 'gt'
            },
            action: {
              route: 'low,model',
              transformers: [],
              description: '低优先级规则'
            }
          }
        ]
      },
      Providers: []
    };

    const router = new UnifiedRouter(configWithOverlappingRules.Router);

    // 1. 测试高优先级规则生效
    const highTokenContext = createMockRouteContext({ tokenCount: 60000 });
    const highResult = router.route(highTokenContext);
    expect(highResult.route).toBe('high,model');
    expect(highResult.matchedRule).toBe('highPriority');

    // 2. 测试只有低优先级规则匹配的情况
    const mediumTokenContext = createMockRouteContext({ tokenCount: 20000 });
    const mediumResult = router.route(mediumTokenContext);
    expect(mediumResult.route).toBe('low,model');
    expect(mediumResult.matchedRule).toBe('lowPriority');

    // 3. 测试都不匹配时使用默认路由
    const lowTokenContext = createMockRouteContext({ tokenCount: 5000 });
    const lowResult = router.route(lowTokenContext);
    expect(lowResult.route).toBe('default,model');
  });
});