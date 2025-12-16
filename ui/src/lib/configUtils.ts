/**
 * 配置工具函数
 * 用于处理配置格式的检测和转换
 */

import type { UnifiedRouterConfig, RouterConfig, RouteRule } from '@/types';

// ============================================================================
// 格式检测
// ============================================================================

/**
 * 检测配置是否为统一路由引擎格式
 */
export function isUnifiedFormat(config: any): boolean {
  return config?.Router?.engine === 'unified' || config?.engine === 'unified';
}

/**
 * 检测配置是否为旧版本格式
 */
export function isLegacyFormat(config: any): boolean {
  return !isUnifiedFormat(config) && !!config?.default;
}

// ============================================================================
// 格式转换
// ============================================================================

/**
 * 将旧版本路由配置转换为新版本格式
 */
export function convertLegacyToUnified(legacy: RouterConfig): UnifiedRouterConfig {
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
export function convertUnifiedToLegacy(unified: UnifiedRouterConfig): RouterConfig {
  const legacy: RouterConfig = {
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
// 工具函数
// ============================================================================

/**
 * 获取路由规则的显示名称
 */
export function getRuleDisplayName(ruleName: string): string {
  const displayNames: Record<string, string> = {
    "longContext": "长上下文",
    "subagent": "子代理",
    "background": "后台模型",
    "webSearch": "网络搜索",
    "thinking": "思考模式",
    "directMapping": "代号映射",
    "userSpecified": "用户指定"
  };

  return displayNames[ruleName] || ruleName;
}

/**
 * 获取条件类型的显示名称
 */
export function getConditionTypeDisplayName(conditionType: string): string {
  const displayNames: Record<string, string> = {
    "tokenThreshold": "Token 阈值",
    "modelContains": "模型包含",
    "toolExists": "工具存在",
    "fieldExists": "字段存在",
    "custom": "自定义函数",
    "externalFunction": "外部函数"
  };

  return displayNames[conditionType] || conditionType;
}

/**
 * 获取操作符的显示名称
 */
export function getOperatorDisplayName(operator: string): string {
  const displayNames: Record<string, string> = {
    "gt": "大于",
    "lt": "小于",
    "eq": "等于",
    "contains": "包含",
    "startsWith": "以...开始",
    "exists": "存在"
  };

  return displayNames[operator] || operator;
}
