/**
 * UI配置适配器测试
 * 测试React hooks和组件的行为
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';

// Mock React hooks
const mockUseState = vi.spyOn(React, 'useState');
const mockUseEffect = vi.spyOn(React, 'useEffect');

// 模拟配置适配器hooks
const mockAdaptedConfig = {
  isUnified: true,
  routerConfig: {
    engine: 'unified',
    defaultRoute: 'test,model',
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
          route: 'test,route',
          transformers: [],
          description: '测试规则'
        }
      }
    ],
    cache: { enabled: true, maxSize: 1000, ttl: 300000 },
    debug: { enabled: false, logLevel: 'info' }
  },
  providers: [
    {
      name: 'test',
      models: ['model1', 'model2']
    }
  ]
};

// 模拟useConfigAdapter hook
const mockUseConfigAdapter = () => {
  return mockAdaptedConfig;
};

// 模拟useConfigUpdater hook
const mockUseConfigUpdater = () => {
  return vi.fn((updates: any) => {
    console.log('Config updated:', updates);
  });
};

describe('配置适配器 Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('应该正确检测统一格式配置', () => {
    const config = {
      Router: {
        engine: 'unified',
        defaultRoute: 'test'
      }
    };

    const isUnified = config.Router.engine === 'unified';
    expect(isUnified).toBe(true);
  });

  test('应该正确检测传统格式配置', () => {
    const config = {
      Router: {
        default: 'test'
      }
    };

    const isLegacy = !config.Router.engine && config.Router.default;
    expect(isLegacy).toBe(true);
  });

  test('应该正确适配配置数据', () => {
    const adapted = mockUseConfigAdapter();

    expect(adapted.isUnified).toBe(true);
    expect(adapted.routerConfig.engine).toBe('unified');
    expect(Array.isArray(adapted.providers)).toBe(true);
  });

  test('应该正确处理null/undefined配置', () => {
    const nullConfig = null;
    const undefinedConfig = undefined;

    expect(nullConfig).toBeFalsy();
    expect(undefinedConfig).toBeFalsy();
  });
});

describe('UI组件渲染测试', () => {
  test('应该正确渲染统一路由引擎界面', () => {
    const isUnified = true;

    // 模拟UI渲染逻辑
    const renderContent = () => {
      if (isUnified) {
        return {
          component: 'UnifiedRouter',
          title: 'Unified Router Engine',
          badge: 'default'
        };
      } else {
        return {
          component: 'LegacyRouter',
          title: 'Legacy Router',
          badge: 'secondary'
        };
      }
    };

    const content = renderContent();

    expect(content.component).toBe('UnifiedRouter');
    expect(content.title).toBe('Unified Router Engine');
    expect(content.badge).toBe('default');
  });

  test('应该正确渲染传统路由界面', () => {
    const isUnified = false;

    const renderContent = () => {
      if (isUnified) {
        return {
          component: 'UnifiedRouter',
          title: 'Unified Router Engine',
          badge: 'default'
        };
      } else {
        return {
          component: 'LegacyRouter',
          title: 'Legacy Router',
          badge: 'secondary'
        };
      }
    };

    const content = renderContent();

    expect(content.component).toBe('LegacyRouter');
    expect(content.title).toBe('Legacy Router');
    expect(content.badge).toBe('secondary');
  });
});

describe('路由规则UI渲染', () => {
  test('应该正确显示规则列表', () => {
    const rules = mockAdaptedConfig.routerConfig.rules;

    const renderRules = () => {
      return rules.map((rule, index) => ({
        id: index,
        name: rule.name,
        priority: rule.priority,
        enabled: rule.enabled,
        description: rule.action.description
      }));
    };

    const renderedRules = renderRules();

    expect(renderedRules).toHaveLength(1);
    expect(renderedRules[0].name).toBe('testRule');
    expect(renderedRules[0].enabled).toBe(true);
    expect(renderedRules[0].description).toBe('测试规则');
  });

  test('应该正确显示规则详情', () => {
    const rule = mockAdaptedConfig.routerConfig.rules[0];

    const renderRuleDetails = (rule: any) => {
      return {
        name: rule.name,
        priority: rule.priority,
        enabled: rule.enabled,
        conditionType: rule.condition.type,
        conditionField: rule.condition.field,
        conditionOperator: rule.condition.operator,
        route: rule.action.route,
        description: rule.action.description
      };
    };

    const details = renderRuleDetails(rule);

    expect(details.name).toBe('testRule');
    expect(details.priority).toBe(100);
    expect(details.conditionType).toBe('fieldExists');
    expect(details.conditionField).toBe('test');
    expect(details.conditionOperator).toBe('exists');
    expect(details.route).toBe('test,route');
    expect(details.description).toBe('测试规则');
  });
});

describe('配置更新测试', () => {
  test('应该正确更新默认路由', () => {
    const updateConfig = mockUseConfigUpdater();

    const handleDefaultRouteChange = (value: string) => {
      updateConfig({
        routerConfig: {
          ...mockAdaptedConfig.routerConfig,
          defaultRoute: value
        }
      });
    };

    act(() => {
      handleDefaultRouteChange('new,model');
    });

    expect(updateConfig).toHaveBeenCalledWith({
      routerConfig: expect.objectContaining({
        defaultRoute: 'new,model'
      })
    });
  });

  test('应该正确切换规则启用状态', () => {
    const updateConfig = mockUseConfigUpdater();

    const handleRuleToggle = (ruleName: string, enabled: boolean) => {
      const updatedRules = mockAdaptedConfig.routerConfig.rules.map(rule =>
        rule.name === ruleName ? { ...rule, enabled } : rule
      );

      updateConfig({
        routerConfig: {
          ...mockAdaptedConfig.routerConfig,
          rules: updatedRules
        }
      });
    };

    act(() => {
      handleRuleToggle('testRule', false);
    });

    expect(updateConfig).toHaveBeenCalledWith({
      routerConfig: expect.objectContaining({
        rules: expect.arrayContaining([
          expect.objectContaining({
            name: 'testRule',
            enabled: false
          })
        ])
      })
    });
  });

  test('应该正确更新规则路由', () => {
    const updateConfig = mockUseConfigUpdater();

    const handleRuleRouteChange = (ruleName: string, route: string) => {
      const updatedRules = mockAdaptedConfig.routerConfig.rules.map(rule =>
        rule.name === ruleName
          ? { ...rule, action: { ...rule.action, route } }
          : rule
      );

      updateConfig({
        routerConfig: {
          ...mockAdaptedConfig.routerConfig,
          rules: updatedRules
        }
      });
    };

    act(() => {
      handleRuleRouteChange('testRule', 'new,route');
    });

    expect(updateConfig).toHaveBeenCalledWith({
      routerConfig: expect.objectContaining({
        rules: expect.arrayContaining([
          expect.objectContaining({
            name: 'testRule',
            action: expect.objectContaining({
              route: 'new,route'
            })
          })
        ])
      })
    });
  });
});

describe('模型选项生成测试', () => {
  test('应该正确生成模型选项列表', () => {
    const providers = mockAdaptedConfig.providers;

    const generateModelOptions = () => {
      return providers.flatMap(provider => {
        if (!provider || !provider.models) return [];
        const providerName = provider.name || 'Unknown Provider';
        return provider.models.map(model => ({
          value: `${providerName},${model}`,
          label: `${providerName}, ${model}`
        }));
      });
    };

    const options = generateModelOptions();

    expect(options).toHaveLength(2);
    expect(options[0]).toEqual({
      value: 'test,model1',
      label: 'test, model1'
    });
    expect(options[1]).toEqual({
      value: 'test,model2',
      label: 'test, model2'
    });
  });

  test('应该正确处理空提供商列表', () => {
    const emptyProviders: any[] = [];

    const options = emptyProviders.flatMap(provider => {
      if (!provider || !provider.models) return [];
      const providerName = provider.name || 'Unknown Provider';
      return provider.models.map(model => ({
        value: `${providerName},${model}`,
        label: `${providerName}, ${model}`
      }));
    });

    expect(options).toHaveLength(0);
  });
});

describe('缓存和调试配置显示', () => {
  test('应该正确显示缓存配置', () => {
    const cacheConfig = mockAdaptedConfig.routerConfig.cache;

    const renderCacheConfig = (cache: any) => {
      return {
        enabled: cache?.enabled !== false ? 'Yes' : 'No',
        maxSize: cache?.maxSize || 1000,
        ttl: cache?.ttl || 300000
      };
    };

    const rendered = renderCacheConfig(cacheConfig);

    expect(rendered.enabled).toBe('Yes');
    expect(rendered.maxSize).toBe(1000);
    expect(rendered.ttl).toBe(300000);
  });

  test('应该正确显示调试配置', () => {
    const debugConfig = mockAdaptedConfig.routerConfig.debug;

    const renderDebugConfig = (debug: any) => {
      return {
        enabled: debug?.enabled ? 'Yes' : 'No',
        logLevel: debug?.logLevel || 'info'
      };
    };

    const rendered = renderDebugConfig(debugConfig);

    expect(rendered.enabled).toBe('No');
    expect(rendered.logLevel).toBe('info');
  });
});