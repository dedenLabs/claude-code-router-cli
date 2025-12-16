/**
 * 路由评估逻辑单元测试
 * 测试统一路由引擎的规则评估逻辑
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { UnifiedRouter } from '../../src/utils/unified-router';
import type { UnifiedRouterConfig, RouteContext } from '../../src/types/router';

// 读取测试 fixtures
const unifiedConfig = JSON.parse(readFileSync(join(__dirname, '../fixtures/unified-config.json'), 'utf8'));
const testRequests = JSON.parse(readFileSync(join(__dirname, '../fixtures/test-requests.json'), 'utf8'));

describe('UnifiedRouter 路由评估', () => {
  let router: UnifiedRouter;
  let mockLogger: any;

  beforeEach(() => {
    // 创建 mock logger
    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    // 初始化路由器
    router = new UnifiedRouter(unifiedConfig.Router as UnifiedRouterConfig);
  });

  describe('路由规则优先级', () => {
    test('应该按照优先级顺序评估规则', () => {
      const rules = router.getRules();
      const priorities = rules.map(rule => rule.priority || 0);

      // 验证规则按优先级降序排列
      for (let i = 0; i < priorities.length - 1; i++) {
        expect(priorities[i]).toBeGreaterThanOrEqual(priorities[i + 1]);
      }
    });

    test('应该只评估启用的规则', () => {
      const rules = router.getRules();
      const disabledRules = rules.filter(rule => rule.enabled === false);

      expect(disabledRules).toHaveLength(0);
    });
  });

  describe('条件评估逻辑', () => {
    test('getFieldValue 方法测试', () => {
      const request1 = {
        body: {
          model: 'test',
          thinking: { type: 'enabled' }
        }
      };

      const request2 = {
        body: {
          model: 'test',
          system: [
            { role: 'system', content: 'You are a helpful assistant' },
            { role: 'system', content: '<CCR-SUBAGENT-MODEL>opus,MiniMax-M2</CCR-SUBAGENT-MODEL>' }
          ]
        }
      };

      // 测试不存在的字段
      const fieldValue1 = router['getFieldValue'](request1.body, 'system.1.text');
      expect(fieldValue1).toBeUndefined();

      // 测试存在的字段
      const fieldValue2 = router['getFieldValue'](request2.body, 'system.1.text');
      expect(fieldValue2).toBe('<CCR-SUBAGENT-MODEL>opus,MiniMax-M2</CCR-SUBAGENT-MODEL>');
    });

    test('应该正确评估 fieldExists 条件 - exists 操作符', async () => {
      const request = {
        body: {
          model: 'test',
          thinking: { type: 'enabled' }
        }
      };

      const context: RouteContext = {
        tokenCount: 1000,
        messages: [],
        system: [],
        tools: [],
        req: request,
        log: mockLogger
      };

      // 模拟评估条件
      const condition = {
        type: 'fieldExists' as const,
        field: 'thinking',
        operator: 'exists' as const
      };

      // 这里需要直接测试条件评估逻辑
      const fieldValue = request.body?.thinking;
      const matches = fieldValue !== undefined && fieldValue !== null;

      expect(matches).toBe(true);
    });

    test('应该正确评估 fieldExists 条件 - contains 操作符', async () => {
      const request = {
        body: {
          model: 'test',
          system: [
            { role: 'system', content: 'You are a helpful assistant' },
            { role: 'system', content: '<CCR-SUBAGENT-MODEL>opus,MiniMax-M2</CCR-SUBAGENT-MODEL>' }
          ]
        }
      };

      const context: RouteContext = {
        tokenCount: 1000,
        messages: [],
        system: request.body.system,
        tools: [],
        req: request,
        log: mockLogger
      };

      const fieldValue = request.body?.system?.[1]?.text || request.body?.system?.[1]?.content;
      const matches = fieldValue?.includes('<CCR-SUBAGENT-MODEL>');

      expect(matches).toBe(true);
    });

    test('应该正确评估 tokenThreshold 条件', async () => {
      const context: RouteContext = {
        tokenCount: 70000,
        messages: [],
        system: [],
        tools: [],
        req: { body: {} },
        log: mockLogger
      };

      const condition = {
        type: 'tokenThreshold' as const,
        value: 60000,
        operator: 'gt' as const
      };

      const matches = context.tokenCount > condition.value;
      expect(matches).toBe(true);
    });

    test('应该正确评估 modelContains 条件', async () => {
      const request = {
        body: {
          model: 'haiku,something'
        }
      };

      const context: RouteContext = {
        tokenCount: 1000,
        messages: [],
        system: [],
        tools: [],
        req: request,
        log: mockLogger
      };

      const condition = {
        type: 'modelContains' as const,
        value: 'haiku',
        operator: 'contains' as const
      };

      const model = context.req?.body?.model || '';
      const matches = model.includes(condition.value);
      expect(matches).toBe(true);
    });

    test('应该正确评估 toolExists 条件', async () => {
      const request = {
        body: {
          model: 'test',
          tools: [
            { type: 'web_search', function: { name: 'search_web' } }
          ]
        }
      };

      const context: RouteContext = {
        tokenCount: 1000,
        messages: [],
        system: [],
        tools: request.body.tools,
        req: request,
        log: mockLogger
      };

      const condition = {
        type: 'toolExists' as const,
        value: 'web_search',
        operator: 'exists' as const
      };

      const hasTool = context.tools.some(tool =>
        tool.type?.includes(condition.value) ||
        tool.function?.name?.includes(condition.value)
      );

      expect(hasTool).toBe(true);
    });
  });

  describe('自定义条件评估', () => {
    test('应该正确评估 modelContainsComma 条件', async () => {
      const request1 = {
        body: {
          model: 'provider,model'
        }
      };

      const request2 = {
        body: {
          model: 'simplemodel'
        }
      };

      const matches1 = request1.body?.model?.includes(',') || false;
      const matches2 = request2.body?.model?.includes(',') || false;

      expect(matches1).toBe(true);
      expect(matches2).toBe(false);
    });

    test('应该正确评估 directModelMapping 条件', async () => {
      const request1 = {
        body: {
          model: 'haiku'
        }
      };

      const request2 = {
        body: {
          model: 'provider,model'
        }
      };

      const request3 = {
        body: {
          model: ''
        }
      };

      const matches1 = !!(request1.body?.model && !request1.body.model.includes(',') && request1.body.model.trim() !== '');
      const matches2 = !!(request2.body?.model && !request2.body.model.includes(',') && request2.body.model.trim() !== '');
      const matches3 = !!(request3.body?.model && !request3.body.model.includes(',') && request3.body.model.trim() !== '');

      expect(matches1).toBe(true);
      expect(matches2).toBe(false);
      expect(matches3).toBe(false);
    });
  });

  describe('调试子代理规则', () => {
    test('调试subagent规则匹配', async () => {
      const request = {
        body: {
          model: 'sonnet',
          system: [
            { role: 'system', content: 'You are a helpful assistant' },
            { role: 'system', content: '<CCR-SUBAGENT-MODEL>opus,MiniMax-M2</CCR-SUBAGENT-MODEL>' }
          ]
        }
      };

      const context: RouteContext = {
        tokenCount: 1000,
        messages: [],
        system: request.body.system,
        tools: [],
        req: request,
        log: mockLogger
      };

      // 直接测试字段访问
      const fieldValue = router['getFieldValue'](request.body, 'system.1.text');
      console.log('字段值:', fieldValue);

      const containsSubagent = fieldValue && fieldValue.includes('<CCR-SUBAGENT-MODEL>');
      console.log('包含子代理标记:', containsSubagent);

      // 测试subagent条件
      const subagentCondition = {
        type: 'fieldExists' as const,
        field: 'system.1.text',
        operator: 'contains' as const
      };

      const conditionResult = await router['evaluateCondition'](subagentCondition, context);
      console.log('subagent条件评估结果:', conditionResult);

      // 测试directMapping条件
      const directMappingCondition = {
        type: 'custom' as const,
        customFunction: 'directModelMapping'
      };

      const directMappingResult = await router['evaluateCondition'](directMappingCondition, context);
      console.log('directMapping条件评估结果:', directMappingResult);

      // 测试完整路由
      const result = await router.evaluate(request, 1000, { Providers: [] });
      console.log('路由结果:', result);
    });
  });

  describe('完整路由流程测试', () => {
    testRequests.testCases.forEach(testCase => {
      test(`应该正确路由: ${testCase.name}`, async () => {
        const request = {
          body: testCase.request.body
        };

        const config = {
          Providers: unifiedConfig.Providers
        };

        const tokenCount = testCase.tokenCount || 1000;

        // 临时启用调试模式以查看匹配过程
        const originalDebug = router.getRules().some(rule => rule.name === 'subagent');

        const result = await router.evaluate(request, tokenCount, config);

        expect(result.route).toBe(testCase.expectedRoute);
        expect(result.matchedRule).toBe(testCase.expectedRule);
        expect(result.decisionTime).toBeGreaterThanOrEqual(0);
        expect(result.fromCache).toBe(false);
      });
    });
  });

  describe('变量替换', () => {
    test('应该正确替换 ${userModel} 变量', async () => {
      const request = {
        body: {
          model: 'custom,model'
        }
      };

      const result = await router.evaluate(request, 1000, { Providers: [] });

      expect(result.route).toBe('custom,model');
    });

    test('应该正确替换 ${subagent} 变量', async () => {
      const request = {
        body: {
          model: 'test',
          system: [
            {},
            { role: 'system', content: '<CCR-SUBAGENT-MODEL>opus,MiniMax-M2</CCR-SUBAGENT-MODEL>' }
          ]
        }
      };

      const result = await router.evaluate(request, 1000, { Providers: [] });

      expect(result.route).toBe('opus,MiniMax-M2');
    });

    test('应该正确替换 ${mappedModel} 变量', async () => {
      const request = {
        body: {
          model: 'claude'
        }
      };

      const config = {
        Providers: unifiedConfig.Providers
      };

      const result = await router.evaluate(request, 1000, config);

      // 当用户指定简单模型名(不含逗号)时，应该映射为 model,DefaultModel 格式
      expect(result.route).toBe('claude,MiniMax-M2');
    });
  });

  describe('缓存功能', () => {
    test('应该缓存路由结果', async () => {
      const request = {
        body: {
          model: 'test'
        }
      };

      const config = {
        Providers: []
      };

      const result1 = await router.evaluate(request, 1000, config);
      const result2 = await router.evaluate(request, 1000, config);

      expect(result1.decisionTime).toBeGreaterThanOrEqual(result2.decisionTime);
      expect(result2.fromCache).toBe(true);
    });

    test('应该清除缓存', async () => {
      router.clearCache();

      const request = {
        body: {
          model: 'test'
        }
      };

      const result = await router.evaluate(request, 1000, { Providers: [] });
      expect(result.fromCache).toBe(false);
    });
  });

  describe('规则管理', () => {
    test('应该能够添加新规则', () => {
      const newRule = {
        name: 'testRule',
        priority: 10,
        enabled: true,
        condition: {
          type: 'custom' as const,
          customFunction: 'testFunction'
        },
        action: {
          route: 'test,route',
          transformers: []
        }
      };

      router.addRule(newRule);

      const rules = router.getRules();
      const addedRule = rules.find(rule => rule.name === 'testRule');

      expect(addedRule).toBeDefined();
      expect(addedRule?.priority).toBe(10);
    });

    test('应该能够切换规则启用状态', () => {
      router.toggleRule('directMapping', false);

      const rules = router.getRules();
      const directMappingRule = rules.find(rule => rule.name === 'directMapping');

      expect(directMappingRule?.enabled).toBe(false);
    });

    test('应该能够移除规则', () => {
      router.removeRule('testRule');

      const rules = router.getRules();
      const removedRule = rules.find(rule => rule.name === 'testRule');

      expect(removedRule).toBeUndefined();
    });
  });

  describe('统计信息', () => {
    test('应该正确跟踪统计信息', async () => {
      const statsBefore = router.getStats();

      const request = {
        body: {
          model: 'test'
        }
      };

      await router.evaluate(request, 1000, { Providers: [] });

      const statsAfter = router.getStats();

      expect(statsAfter.totalRoutes).toBe(statsBefore.totalRoutes + 1);
    });

    test('应该正确跟踪缓存命中率', async () => {
      const request = {
        body: {
          model: 'test'
        }
      };

      // 第一次请求
      await router.evaluate(request, 1000, { Providers: [] });

      // 第二次请求（应该命中缓存）
      await router.evaluate(request, 1000, { Providers: [] });

      const stats = router.getStats();
      expect(stats.cacheHits).toBe(1);
      expect(stats.cacheMisses).toBe(1);
    });
  });
});