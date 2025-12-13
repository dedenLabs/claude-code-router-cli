/**
 * 统一路由引擎测试
 */

import { UnifiedRouter, migrateLegacyConfig } from '../utils/unified-router';
import { UnifiedRouterConfig } from '../types/router';

describe('UnifiedRouter', () => {
  let router: UnifiedRouter;
  let mockConfig: any;

  beforeEach(() => {
    // 创建模拟配置
    mockConfig = {
      Providers: [
        {
          name: 'openrouter',
          models: ['claude-3.5-sonnet', 'claude-3.7-sonnet']
        },
        {
          name: 'gemini',
          models: ['gemini-2.5-flash', 'gemini-2.5-pro']
        }
      ]
    };

    // 创建路由配置
    const routerConfig: UnifiedRouterConfig = {
      engine: 'unified',
      defaultRoute: 'openrouter,claude-3.5-sonnet',
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
            route: 'gemini,gemini-2.5-pro'
          }
        },
        {
          name: 'userSpecified',
          priority: 40,
          enabled: true,
          condition: {
            type: 'custom',
            customFunction: 'modelContainsComma'
          },
          action: {
            route: '${userModel}'
          }
        }
      ],
      debug: {
        enabled: false
      }
    };

    router = new UnifiedRouter(routerConfig);
  });

  test('应该使用默认路由当没有规则匹配时', async () => {
    const req = {
      body: {
        model: 'test-model',
        messages: []
      }
    };

    const result = await router.route(req, 1000, mockConfig);
    expect(result).toBe('openrouter,claude-3.5-sonnet');
  });

  test('应该匹配token阈值规则', async () => {
    const req = {
      body: {
        model: 'test-model',
        messages: []
      }
    };

    const result = await router.route(req, 70000, mockConfig);
    expect(result).toBe('gemini,gemini-2.5-pro');
  });

  test('应该处理用户指定的provider,model格式', async () => {
    const req = {
      body: {
        model: 'gemini,gemini-2.5-flash',
        messages: []
      }
    };

    const result = await router.route(req, 1000, mockConfig);
    expect(result).toBe('gemini,gemini-2.5-flash');
  });

  test('应该正确映射直接模型名', async () => {
    const req = {
      body: {
        model: 'claude-3.7-sonnet',
        messages: []
      }
    };

    const result = await router.route(req, 1000, mockConfig);
    expect(result).toBe('openrouter,claude-3.5-sonnet');
  });
});

describe('Legacy Config Migration', () => {
  test('应该正确迁移旧配置', () => {
    const legacyConfig = {
      default: 'openrouter,claude-3.5-sonnet',
      background: 'gemini,gemini-2.5-flash',
      think: 'deepseek,deepseek-reasoner',
      longContext: 'gemini,gemini-2.5-pro',
      webSearch: 'gemini,gemini-2.5-flash',
      longContextThreshold: 60000
    };

    const unifiedConfig = migrateLegacyConfig(legacyConfig);

    expect(unifiedConfig.engine).toBe('unified');
    expect(unifiedConfig.defaultRoute).toBe('openrouter,claude-3.5-sonnet');
    expect(unifiedConfig.rules).toHaveLength(7); // 7个默认规则

    // 检查长上下文规则
    const longContextRule = unifiedConfig.rules.find(r => r.name === 'longContext');
    expect(longContextRule).toBeDefined();
    expect(longContextRule?.condition.value).toBe(60000);
    expect(longContextRule?.action.route).toBe('gemini,gemini-2.5-pro');
  });
});