/**
 * 配置转换单元测试
 * 测试 legacy 配置到 unified 配置的转换逻辑
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { convertLegacyToUnified, convertUnifiedToLegacy, isUnifiedFormat, isLegacyFormat, normalizeConfig } from '../../src/utils/config-handler';
import { migrateLegacyConfig } from '../../src/utils/unified-router';
import type { RouterConfig, UnifiedRouterConfig } from '../../src/types/router';

// 读取测试 fixtures
const legacyConfig = JSON.parse(readFileSync(join(__dirname, '../fixtures/legacy-config.json'), 'utf8'));
const unifiedConfig = JSON.parse(readFileSync(join(__dirname, '../fixtures/unified-config.json'), 'utf8'));

describe('配置格式检测', () => {
  test('应该正确检测统一格式配置', () => {
    expect(isUnifiedFormat(unifiedConfig)).toBe(true);
    expect(isUnifiedFormat({ Router: { engine: 'unified' } })).toBe(true);
  });

  test('应该正确检测传统格式配置', () => {
    expect(isLegacyFormat(legacyConfig)).toBe(true);
    expect(isLegacyFormat({ Router: { default: 'test' } })).toBe(true);
  });

  test('应该正确识别无效配置', () => {
    expect(isUnifiedFormat({})).toBe(false);
    expect(isLegacyFormat({})).toBe(false);
    expect(isUnifiedFormat({ Router: {} })).toBe(false);
  });
});

describe('Legacy 到 Unified 转换', () => {
  test('应该正确转换完整的 legacy 配置', () => {
    const result = convertLegacyToUnified(legacyConfig.Router as RouterConfig);

    expect(result.engine).toBe('unified');
    expect(result.defaultRoute).toBe('sonnet,MiniMax-M2');
    expect(result.rules).toHaveLength(7);
    expect(result.cache?.enabled).toBe(true);
    expect(result.debug?.enabled).toBe(false);
  });

  test('应该包含所有必需的规则', () => {
    const result = convertLegacyToUnified(legacyConfig.Router as RouterConfig);
    const ruleNames = result.rules.map(rule => rule.name);

    expect(ruleNames).toContain('longContext');
    expect(ruleNames).toContain('subagent');
    expect(ruleNames).toContain('background');
    expect(ruleNames).toContain('webSearch');
    expect(ruleNames).toContain('thinking');
    expect(ruleNames).toContain('directMapping');
    expect(ruleNames).toContain('userSpecified');
  });

  test('应该为每个规则添加正确的字段', () => {
    const result = convertLegacyToUnified(legacyConfig.Router as RouterConfig);

    result.rules.forEach(rule => {
      expect(rule.name).toBeDefined();
      expect(rule.priority).toBeDefined();
      expect(rule.enabled).toBe(true);
      expect(rule.condition).toBeDefined();
      expect(rule.action).toBeDefined();
      expect(rule.action.route).toBeDefined();
      expect(rule.action.transformers).toEqual([]);
      expect(rule.action.description).toBeDefined();
    });
  });

  test('应该正确设置思考模式规则的操作符', () => {
    const result = convertLegacyToUnified(legacyConfig.Router as RouterConfig);
    const thinkingRule = result.rules.find(rule => rule.name === 'thinking');

    expect(thinkingRule?.condition.type).toBe('fieldExists');
    expect(thinkingRule?.condition.field).toBe('thinking');
    expect(thinkingRule?.condition.operator).toBe('exists');
    expect(thinkingRule?.condition.value).toBeUndefined();
  });

  test('应该正确设置长上下文规则', () => {
    const result = convertLegacyToUnified(legacyConfig.Router as RouterConfig);
    const longContextRule = result.rules.find(rule => rule.name === 'longContext');

    expect(longContextRule?.condition.type).toBe('tokenThreshold');
    expect(longContextRule?.condition.value).toBe(60000);
    expect(longContextRule?.condition.operator).toBe('gt');
    expect(longContextRule?.action.route).toBe('sonnet,MiniMax-M2');
  });

  test('应该处理部分配置的 legacy 格式', () => {
    const partialLegacy: RouterConfig = {
      default: 'test',
      background: 'haiku',
      think: '',
      longContext: '',
      webSearch: '',
      longContextThreshold: 50000
    };

    const result = convertLegacyToUnified(partialLegacy);

    // 应该只包含 background 规则（因为其他为空）
    const backgroundRule = result.rules.find(rule => rule.name === 'background');
    expect(backgroundRule).toBeDefined();

    // thinking, longContext, webSearch 规则不应该存在
    const thinkingRule = result.rules.find(rule => rule.name === 'thinking');
    const longContextRule = result.rules.find(rule => rule.name === 'longContext');
    const webSearchRule = result.rules.find(rule => rule.name === 'webSearch');

    expect(thinkingRule).toBeUndefined();
    expect(longContextRule).toBeUndefined();
    expect(webSearchRule).toBeUndefined();
  });
});

describe('Unified 到 Legacy 转换', () => {
  test('应该正确转换回 legacy 格式', () => {
    const unifiedRouter = unifiedConfig.Router as UnifiedRouterConfig;
    const result = convertUnifiedToLegacy(unifiedRouter);

    expect(result.default).toBe('sonnet,MiniMax-M2');
    expect(result.background).toBe('haiku,MiniMax-M2');
    expect(result.think).toBe('opus,MiniMax-M2');
    expect(result.longContext).toBe('sonnet,MiniMax-M2');
    expect(result.webSearch).toBe('sonnet,MiniMax-M2');
    expect(result.longContextThreshold).toBe(60000);
  });

  test('应该正确提取规则信息', () => {
    const unifiedRouter = unifiedConfig.Router as UnifiedRouterConfig;
    const result = convertUnifiedToLegacy(unifiedRouter);

    expect(result.background).toBe('haiku,MiniMax-M2');
    expect(result.think).toBe('opus,MiniMax-M2');
    expect(result.longContext).toBe('sonnet,MiniMax-M2');
    expect(result.webSearch).toBe('sonnet,MiniMax-M2');
  });
});

describe('配置规范化', () => {
  test('应该规范化 legacy 配置', () => {
    const normalized = normalizeConfig(legacyConfig);

    expect(isUnifiedFormat(normalized)).toBe(true);
    expect(normalized.Router.engine).toBe('unified');
  });

  test('应该保持 unified 配置不变', () => {
    const normalized = normalizeConfig(unifiedConfig);

    expect(normalized).toEqual(unifiedConfig);
  });

  test('应该为缺失字段添加默认值', () => {
    const incompleteConfig = {
      Router: {
        engine: 'unified',
        defaultRoute: 'test'
      }
    };

    const normalized = normalizeConfig(incompleteConfig);

    expect(normalized.Router.rules).toEqual([]);
    expect(normalized.Router.cache).toBeDefined();
    expect(normalized.Router.debug).toBeDefined();
  });
});

describe('migrateLegacyConfig 函数一致性', () => {
  test('migrateLegacyConfig 应该与 convertLegacyToUnified 产生相同结果', () => {
    const legacyRouter = legacyConfig.Router as RouterConfig;

    const result1 = migrateLegacyConfig(legacyRouter);
    const result2 = convertLegacyToUnified(legacyRouter);

    // 比较关键字段
    expect(result1.engine).toBe(result2.engine);
    expect(result1.defaultRoute).toBe(result2.defaultRoute);
    expect(result1.rules).toHaveLength(result2.rules.length);

    // 比较每个规则
    result1.rules.forEach((rule, index) => {
      const otherRule = result2.rules[index];
      expect(rule.name).toBe(otherRule.name);
      expect(rule.priority).toBe(otherRule.priority);
      expect(rule.enabled).toBe(otherRule.enabled);
      expect(rule.condition.type).toBe(otherRule.condition.type);
      expect(rule.condition.operator).toBe(otherRule.condition.operator);
      expect(rule.action.route).toBe(otherRule.action.route);
      expect(rule.action.description).toBe(otherRule.action.description);
    });

    expect(result1.cache).toEqual(result2.cache);
    expect(result1.debug).toEqual(result2.debug);
    expect(result1.contextThreshold).toEqual(result2.contextThreshold);
  });
});

describe('边界情况测试', () => {
  test('应该处理空配置', () => {
    const emptyConfig = { Router: {} };
    const normalized = normalizeConfig(emptyConfig);

    expect(normalized.Router.engine).toBe('unified');
    expect(normalized.Router.defaultRoute).toBeDefined();
  });

  test('应该处理缺少必需字段的配置', () => {
    const invalidConfig = {
      Router: {
        engine: 'unified',
        // 缺少 defaultRoute
        rules: []
      }
    };

    const normalized = normalizeConfig(invalidConfig);

    expect(normalized.Router.defaultRoute).toBeDefined();
  });

  test('应该处理无效的 legacy 配置', () => {
    const invalidLegacy = {
      Router: {
        // 缺少所有必需字段
      }
    };

    const normalized = normalizeConfig(invalidLegacy);

    expect(normalized.Router.engine).toBe('unified');
  });
});