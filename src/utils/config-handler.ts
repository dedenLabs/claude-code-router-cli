/**
 * 配置处理模块 - 统一处理新旧版本配置格式
 * 用于解决 UI 显示和编辑统一路由引擎配置的问题
 */

import { UnifiedRouterConfig, RouteRule } from '../types/router';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 旧版路由配置接口
 */
export interface LegacyRouterConfig {
  default: string;
  background: string;
  think: string;
  longContext: string;
  longContextThreshold: number;
  webSearch: string;
  image: string;
  custom?: any;
}

/**
 * 完整的配置接口（支持新旧格式）
 */
export interface CompleteConfig {
  Providers: any[];
  Router: UnifiedRouterConfig | LegacyRouterConfig;
  transformers: any[];
  [key: string]: any;
}

// ============================================================================
// 转换函数
// ============================================================================

/**
 * 将旧版本配置转换为新版本格式
 */
export function convertLegacyToUnified(legacy: LegacyRouterConfig): UnifiedRouterConfig {
  const rules: RouteRule[] = [];

  // 长上下文规则
  if (legacy.longContext) {
    rules.push({
      name: "longContext",
      priority: 100,
      enabled: true,
      condition: {
        type: "tokenThreshold",
        value: legacy.longContextThreshold || 60000,
        operator: "gt"
      },
      action: {
        route: legacy.longContext,
        transformers: [],
        description: "长上下文路由：基于token阈值选择模型"
      }
    });
  }

  // 子代理规则
  rules.push({
    name: "subagent",
    priority: 90,
    enabled: true,
    condition: {
      type: "fieldExists",
      field: "system.1.text",
      operator: "contains"
    },
    action: {
      route: "${subagent}",
      transformers: [],
      description: "子代理路由：通过特殊标记选择模型"
    }
  });

  // 后台模型规则（Haiku）
  if (legacy.background) {
    rules.push({
      name: "background",
      priority: 80,
      enabled: true,
      condition: {
        type: "modelContains",
        value: "haiku",
        operator: "contains"
      },
      action: {
        route: legacy.background,
        transformers: [],
        description: "后台路由：Haiku模型自动使用轻量级模型"
      }
    });
  }

  // 网络搜索规则
  if (legacy.webSearch) {
    rules.push({
      name: "webSearch",
      priority: 70,
      enabled: true,
      condition: {
        type: "toolExists",
        value: "web_search",
        operator: "exists"
      },
      action: {
        route: legacy.webSearch,
        transformers: [],
        description: "网络搜索路由：检测到web_search工具时使用特定模型"
      }
    });
  }

  // 思考模式规则
  if (legacy.think) {
    rules.push({
      name: "thinking",
      priority: 60,
      enabled: true,
      condition: {
        type: "fieldExists",
        field: "thinking",
        operator: "exists"
      },
      action: {
        route: legacy.think,
        transformers: [],
        description: "思考模式路由：检测thinking参数时使用特定模型"
      }
    });
  }

  // 代号模型映射规则
  rules.push({
    name: "directMapping",
    priority: 50,
    enabled: true,
    condition: {
      type: "custom",
      customFunction: "directModelMapping"
    },
    action: {
      route: "${mappedModel}",
      transformers: [],
      description: "代号映射：将provider作为代号，映射到对应的model模型"
    }
  });

  // 用户指定模型规则（包含逗号的provider,model格式）
  rules.push({
    name: "userSpecified",
    priority: 40,
    enabled: true,
    condition: {
      type: "custom",
      customFunction: "modelContainsComma"
    },
    action: {
      route: "${userModel}",
      transformers: [],
      description: "用户指定路由：用户在请求中直接指定provider,model格式"
    }
  });

  return {
    engine: "unified",
    defaultRoute: legacy.default || "",
    rules,
    cache: {
      enabled: true,
      maxSize: 1000,
      ttl: 300000
    },
    debug: {
      enabled: false,
      logLevel: "info",
      logToFile: true,
      logToConsole: true
    },
    contextThreshold: {
      default: 1000,
      longContext: legacy.longContextThreshold || 60000
    }
  };
}

/**
 * 将新版本配置转换为旧版本格式（用于向后兼容）
 */
export function convertUnifiedToLegacy(unified: UnifiedRouterConfig): LegacyRouterConfig {
  const legacy: LegacyRouterConfig = {
    default: unified.defaultRoute,
    background: "",
    think: "",
    longContext: "",
    longContextThreshold: unified.contextThreshold?.longContext || 60000,
    webSearch: "",
    image: ""
  };

  // 从规则中提取各种模型配置
  for (const rule of unified.rules) {
    switch (rule.name) {
      case "background":
        legacy.background = rule.action.route;
        break;
      case "thinking":
        legacy.think = rule.action.route;
        break;
      case "longContext":
        legacy.longContext = rule.action.route;
        break;
      case "webSearch":
        legacy.webSearch = rule.action.route;
        break;
    }
  }

  return legacy;
}

// ============================================================================
// 格式检测和规范化
// ============================================================================

/**
 * 检测配置是否为统一路由引擎格式
 */
export function isUnifiedFormat(config: any): boolean {
  return config?.Router?.engine === 'unified';
}

/**
 * 检测配置是否为旧版本格式
 */
export function isLegacyFormat(config: any): boolean {
  return !isUnifiedFormat(config) && !!config?.Router?.default;
}

/**
 * 规范化配置格式，确保始终返回统一格式
 */
export function normalizeConfig(config: CompleteConfig): CompleteConfig {
  const normalizedConfig = { ...config };

  // 如果Router为空，创建默认配置
  if (!normalizedConfig.Router) {
    normalizedConfig.Router = {
      engine: 'unified',
      defaultRoute: 'openrouter,anthropic/claude-3.5-sonnet',
      rules: [],
      cache: { enabled: true, maxSize: 1000, ttl: 300000 },
      debug: { enabled: false, logLevel: 'info', logToFile: true, logToConsole: true }
    };
    return normalizedConfig;
  }

  // 如果是旧格式，转换为新格式
  if (isLegacyFormat(normalizedConfig)) {
    const unified = convertLegacyToUnified(normalizedConfig.Router as LegacyRouterConfig);
    normalizedConfig.Router = unified;
    return normalizedConfig;
  }

  // 确保统一格式有必要的字段
  const router = normalizedConfig.Router as UnifiedRouterConfig;
  if (!router.engine) {
    router.engine = 'unified';
  }
  if (!router.defaultRoute) {
    router.defaultRoute = 'openrouter,anthropic/claude-3.5-sonnet';
  }
  if (!router.rules) {
    router.rules = [];
  }
  if (!router.cache) {
    router.cache = { enabled: true, maxSize: 1000, ttl: 300000 };
  }
  if (!router.debug) {
    router.debug = { enabled: false, logLevel: 'info', logToFile: true, logToConsole: true };
  }

  return normalizedConfig;
}

// ============================================================================
// UI 适配器
// ============================================================================

/**
 * 为 UI 组件提供适配的数据格式
 */
export interface UIAdapterConfig {
  // UI显示使用的格式
  displayFormat: 'unified' | 'legacy';
  // 实际的路由配置
  routerConfig: UnifiedRouterConfig | LegacyRouterConfig;
  // 提供商列表
  providers: any[];
  // 其他配置
  [key: string]: any;
}

/**
 * 为 UI 适配配置数据
 */
export function adaptConfigForUI(config: CompleteConfig): UIAdapterConfig {
  const normalizedConfig = normalizeConfig(config);
  const isUnified = isUnifiedFormat(normalizedConfig);

  return {
    displayFormat: isUnified ? 'unified' : 'legacy',
    routerConfig: normalizedConfig.Router,
    providers: normalizedConfig.Providers || [],
    ...normalizedConfig
  };
}

/**
 * 从 UI 配置更新回实际配置
 */
export function updateConfigFromUI(
  currentConfig: CompleteConfig,
  uiConfig: Partial<UIAdapterConfig>
): CompleteConfig {
  const updatedConfig = { ...currentConfig };

  // 更新提供商
  if (uiConfig.providers) {
    updatedConfig.Providers = uiConfig.providers;
  }

  // 更新路由配置
  if (uiConfig.routerConfig) {
    updatedConfig.Router = uiConfig.routerConfig;
  }

  // 更新其他字段
  Object.keys(uiConfig).forEach(key => {
    if (!['displayFormat', 'routerConfig', 'providers'].includes(key)) {
      updatedConfig[key] = uiConfig[key];
    }
  });

  return normalizeConfig(updatedConfig);
}

// ============================================================================
// 验证函数
// ============================================================================

/**
 * 验证统一路由配置的有效性
 */
export function validateUnifiedConfig(config: UnifiedRouterConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.defaultRoute) {
    errors.push('defaultRoute is required');
  }

  if (!Array.isArray(config.rules)) {
    errors.push('rules must be an array');
  } else {
    config.rules.forEach((rule, index) => {
      if (!rule.name) {
        errors.push(`Rule at index ${index} must have a name`);
      }
      if (!rule.condition) {
        errors.push(`Rule "${rule.name}" must have a condition`);
      }
      if (!rule.action) {
        errors.push(`Rule "${rule.name}" must have an action`);
      }
      if (!rule.action?.route) {
        errors.push(`Rule "${rule.name}" must have a route in action`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 验证旧版路由配置的有效性
 */
export function validateLegacyConfig(config: LegacyRouterConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.default) {
    errors.push('default is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
