/**
 * TypeScript类型定义测试
 * 确保所有类型定义正确且与实现一致
 */

import { describe, test, expect } from 'vitest';
import type {
  RouteCondition,
  RouteAction,
  RouteRule,
  UnifiedRouterConfig,
  LegacyRouterConfig,
  RouterConfig,
  AnyRouterConfig,
  RouteContext,
  RouteResult,
  ConditionEvaluationResult,
  RuleMatchResult,
  RouteStats
} from '../../src/types/router';

// Type guard functions
const isRouteCondition = (obj: any): obj is RouteCondition => {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.type === 'string' &&
    ['tokenThreshold', 'modelContains', 'toolExists', 'fieldExists', 'custom', 'externalFunction'].includes(obj.type)
  );
};

const isRouteAction = (obj: any): obj is RouteAction => {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.route === 'string' &&
    (obj.transformers === undefined || Array.isArray(obj.transformers))
  );
};

const isRouteRule = (obj: any): obj is RouteRule => {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.name === 'string' &&
    isRouteCondition(obj.condition) &&
    isRouteAction(obj.action)
  );
};

const isUnifiedRouterConfig = (obj: any): obj is UnifiedRouterConfig => {
  return (
    obj &&
    typeof obj === 'object' &&
    obj.engine === 'unified' &&
    typeof obj.defaultRoute === 'string' &&
    Array.isArray(obj.rules) &&
    obj.rules.every(isRouteRule)
  );
};

const isLegacyRouterConfig = (obj: any): obj is LegacyRouterConfig => {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.default === 'string'
  );
};

describe('RouteCondition 类型验证', () => {
  test('应该正确验证 tokenThreshold 条件', () => {
    const condition: RouteCondition = {
      type: 'tokenThreshold',
      value: 60000,
      operator: 'gt'
    };

    expect(isRouteCondition(condition)).toBe(true);
    expect(condition.type).toBe('tokenThreshold');
    expect(condition.value).toBe(60000);
    expect(condition.operator).toBe('gt');
  });

  test('应该正确验证 modelContains 条件', () => {
    const condition: RouteCondition = {
      type: 'modelContains',
      value: 'haiku',
      operator: 'contains'
    };

    expect(isRouteCondition(condition)).toBe(true);
    expect(condition.type).toBe('modelContains');
    expect(condition.value).toBe('haiku');
    expect(condition.operator).toBe('contains');
  });

  test('应该正确验证 toolExists 条件', () => {
    const condition: RouteCondition = {
      type: 'toolExists',
      value: 'web_search',
      operator: 'exists'
    };

    expect(isRouteCondition(condition)).toBe(true);
    expect(condition.type).toBe('toolExists');
    expect(condition.value).toBe('web_search');
    expect(condition.operator).toBe('exists');
  });

  test('应该正确验证 fieldExists 条件', () => {
    const condition: RouteCondition = {
      type: 'fieldExists',
      field: 'thinking',
      operator: 'exists'
    };

    expect(isRouteCondition(condition)).toBe(true);
    expect(condition.type).toBe('fieldExists');
    expect(condition.field).toBe('thinking');
    expect(condition.operator).toBe('exists');
  });

  test('应该正确验证 custom 条件', () => {
    const condition: RouteCondition = {
      type: 'custom',
      customFunction: 'directModelMapping'
    };

    expect(isRouteCondition(condition)).toBe(true);
    expect(condition.type).toBe('custom');
    expect(condition.customFunction).toBe('directModelMapping');
  });

  test('应该正确验证 externalFunction 条件', () => {
    const condition: RouteCondition = {
      type: 'externalFunction',
      externalFunction: {
        path: './custom-condition.js',
        functionName: 'evaluate'
      }
    };

    expect(isRouteCondition(condition)).toBe(true);
    expect(condition.type).toBe('externalFunction');
    expect(condition.externalFunction?.path).toBe('./custom-condition.js');
    expect(condition.externalFunction?.functionName).toBe('evaluate');
  });

  test('应该拒绝无效的条件类型', () => {
    const invalidCondition = {
      type: 'invalidType',
      value: 'test'
    };

    expect(isRouteCondition(invalidCondition)).toBe(false);
  });
});

describe('RouteAction 类型验证', () => {
  test('应该正确验证包含所有字段的动作', () => {
    const action: RouteAction = {
      route: 'provider,model',
      transformers: ['transformer1', 'transformer2'],
      metadata: { key: 'value' },
      description: '动作描述'
    };

    expect(isRouteAction(action)).toBe(true);
    expect(action.route).toBe('provider,model');
    expect(action.transformers).toHaveLength(2);
    expect(action.metadata).toEqual({ key: 'value' });
    expect(action.description).toBe('动作描述');
  });

  test('应该正确验证最小字段的动作', () => {
    const action: RouteAction = {
      route: 'provider,model'
    };

    expect(isRouteAction(action)).toBe(true);
    expect(action.route).toBe('provider,model');
  });

  test('应该正确验证包含变量的动作', () => {
    const action: RouteAction = {
      route: '${userModel}',
      transformers: []
    };

    expect(isRouteAction(action)).toBe(true);
    expect(action.route).toBe('${userModel}');
  });

  test('应该拒绝无效的动作', () => {
    const invalidAction = {
      route: 123, // 应该是字符串
      transformers: 'not-array' // 应该是数组
    };

    expect(isRouteAction(invalidAction)).toBe(false);
  });
});

describe('RouteRule 类型验证', () => {
  test('应该正确验证完整的规则', () => {
    const rule: RouteRule = {
      name: 'testRule',
      priority: 100,
      enabled: true,
      condition: {
        type: 'fieldExists',
        field: 'test',
        operator: 'exists'
      },
      action: {
        route: 'provider,model',
        transformers: [],
        description: '测试规则'
      }
    };

    expect(isRouteRule(rule)).toBe(true);
    expect(rule.name).toBe('testRule');
    expect(rule.priority).toBe(100);
    expect(rule.enabled).toBe(true);
    expect(isRouteCondition(rule.condition)).toBe(true);
    expect(isRouteAction(rule.action)).toBe(true);
  });

  test('应该正确验证可选字段缺失的规则', () => {
    const rule: RouteRule = {
      name: 'minimalRule',
      condition: {
        type: 'custom',
        customFunction: 'testFunction'
      },
      action: {
        route: 'provider,model'
      }
    };

    expect(isRouteRule(rule)).toBe(true);
    expect(rule.name).toBe('minimalRule');
    expect(rule.priority).toBeUndefined();
    expect(rule.enabled).toBeUndefined();
  });

  test('应该拒绝无效的规则', () => {
    const invalidRule = {
      name: 123, // 应该是字符串
      condition: {
        type: 'invalidType'
      },
      action: {
        route: 'provider,model'
      }
    };

    expect(isRouteRule(invalidRule)).toBe(false);
  });
});

describe('UnifiedRouterConfig 类型验证', () => {
  test('应该正确验证完整的统一路由配置', () => {
    const config: UnifiedRouterConfig = {
      engine: 'unified',
      defaultRoute: 'provider,model',
      rules: [
        {
          name: 'testRule',
          priority: 100,
          enabled: true,
          condition: {
            type: 'fieldExists',
            field: 'test',
            operator: 'exists'
          },
          action: {
            route: 'provider,model',
            transformers: [],
            description: '测试规则'
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
      },
      contextThreshold: {
        default: 1000,
        longContext: 60000
      }
    };

    expect(isUnifiedRouterConfig(config)).toBe(true);
    expect(config.engine).toBe('unified');
    expect(config.rules).toHaveLength(1);
    expect(config.cache?.enabled).toBe(true);
    expect(config.debug?.enabled).toBe(false);
  });

  test('应该正确验证最小字段的统一路由配置', () => {
    const config: UnifiedRouterConfig = {
      engine: 'unified',
      defaultRoute: 'provider,model',
      rules: []
    };

    expect(isUnifiedRouterConfig(config)).toBe(true);
    expect(config.engine).toBe('unified');
    expect(config.defaultRoute).toBe('provider,model');
    expect(config.rules).toEqual([]);
  });

  test('应该拒绝无效的统一路由配置', () => {
    const invalidConfig = {
      engine: 'invalid',
      defaultRoute: 'provider,model',
      rules: []
    };

    expect(isUnifiedRouterConfig(invalidConfig)).toBe(false);
  });
});

describe('LegacyRouterConfig 类型验证', () => {
  test('应该正确验证传统路由配置', () => {
    const config: LegacyRouterConfig = {
      default: 'provider,model',
      background: 'haiku,model',
      think: 'opus,model',
      longContext: 'sonnet,model',
      webSearch: 'sonnet,model',
      longContextThreshold: 60000
    };

    expect(isLegacyRouterConfig(config)).toBe(true);
    expect(config.default).toBe('provider,model');
    expect(config.background).toBe('haiku,model');
  });

  test('应该拒绝无效的传统路由配置', () => {
    const invalidConfig = {
      default: 123, // 应该是字符串
      background: 'haiku,model'
    };

    expect(isLegacyRouterConfig(invalidConfig)).toBe(false);
  });
});

describe('AnyRouterConfig 联合类型', () => {
  test('应该接受UnifiedRouterConfig', () => {
    const unifiedConfig: UnifiedRouterConfig = {
      engine: 'unified',
      defaultRoute: 'provider,model',
      rules: []
    };

    const anyConfig: AnyRouterConfig = unifiedConfig;
    expect(anyConfig.engine).toBe('unified');
  });

  test('应该接受LegacyRouterConfig', () => {
    const legacyConfig: LegacyConfig = {
      default: 'provider,model',
      background: 'haiku,model'
    };

    const anyConfig: AnyRouterConfig = legacyConfig;
    expect(anyConfig.default).toBe('provider,model');
  });
});

describe('路由上下文和结果类型', () => {
  test('应该正确创建RouteContext', () => {
    const context: RouteContext = {
      tokenCount: 1000,
      messages: [],
      system: [],
      tools: [],
      sessionId: 'test-session',
      req: { body: {} },
      log: {
        info: () => {},
        error: () => {}
      }
    };

    expect(context.tokenCount).toBe(1000);
    expect(Array.isArray(context.messages)).toBe(true);
    expect(context.sessionId).toBe('test-session');
  });

  test('应该正确创建RouteResult', () => {
    const result: RouteResult = {
      route: 'provider,model',
      matchedRule: 'testRule',
      transformers: ['transformer1'],
      decisionTime: 100,
      fromCache: false,
      metadata: {
        context: {
          tokenCount: 1000,
          hasTools: false
        }
      }
    };

    expect(result.route).toBe('provider,model');
    expect(result.matchedRule).toBe('testRule');
    expect(result.decisionTime).toBe(100);
    expect(result.fromCache).toBe(false);
  });

  test('应该正确创建ConditionEvaluationResult', () => {
    const evaluation: ConditionEvaluationResult = {
      matches: true,
      value: 'test-value',
      evaluationTime: 50
    };

    expect(evaluation.matches).toBe(true);
    expect(evaluation.value).toBe('test-value');
    expect(evaluation.evaluationTime).toBe(50);
  });

  test('应该正确创建RuleMatchResult', () => {
    const match: RuleMatchResult = {
      matched: true,
      ruleName: 'testRule',
      action: {
        route: 'provider,model',
        transformers: []
      },
      priority: 100,
      evaluations: [
        {
          matches: true,
          evaluationTime: 25
        }
      ]
    };

    expect(match.matched).toBe(true);
    expect(match.ruleName).toBe('testRule');
    expect(match.priority).toBe(100);
    expect(match.evaluations).toHaveLength(1);
  });

  test('应该正确创建RouteStats', () => {
    const stats: RouteStats = {
      totalRoutes: 10,
      ruleMatches: {
        testRule: 5,
        anotherRule: 3
      },
      cacheHits: 7,
      cacheMisses: 3,
      avgRouteTime: 50
    };

    expect(stats.totalRoutes).toBe(10);
    expect(stats.ruleMatches.testRule).toBe(5);
    expect(stats.cacheHits).toBe(7);
    expect(stats.cacheMisses).toBe(3);
    expect(stats.avgRouteTime).toBe(50);
  });
});

describe('类型兼容性测试', () => {
  test('RouteConfig 应该兼容 LegacyRouterConfig', () => {
    const legacyConfig: LegacyRouterConfig = {
      default: 'provider,model'
    };

    const routerConfig: RouterConfig = legacyConfig;
    expect(routerConfig.default).toBe('provider,model');
  });

  test('应该能够从 AnyRouterConfig 正确推断类型', () => {
    const unifiedConfig: UnifiedRouterConfig = {
      engine: 'unified',
      defaultRoute: 'provider,model',
      rules: []
    };

    const anyConfig: AnyRouterConfig = unifiedConfig;

    if (anyConfig.engine === 'unified') {
      expect(anyConfig.defaultRoute).toBe('provider,model');
      expect(Array.isArray(anyConfig.rules)).toBe(true);
    }
  });
});