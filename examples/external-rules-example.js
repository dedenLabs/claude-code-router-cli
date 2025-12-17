/**
 * 外部规则示例文件
 *
 * 演示如何使用 externalFunction 条件类型来加载外部 JS 规则
 */

// 示例1：只打印模型请求的数据不进行匹配
const printModelRequestDataRule = {
  name: 'printModelRequestData',
  priority: 100,
  condition: {
    type: 'externalFunction',
    externalFunction: {
      path: './external-rules/debug-logger.js',
      functionName: 'checkUserPreference'
    }
  },
  action: {
    route: ''
  }
};

// 示例2：基于时间的动态路由
const timeBasedRule = {
  name: 'timeBasedRouting',
  priority: 90,
  condition: {
    type: 'externalFunction',
    externalFunction: {
      path: './external-rules/time-based.js',
      functionName: 'isBusinessHours'
    }
  },
  action: {
    route: 'claude-3-opus,anthropic'
  }
};

// 示例3：复杂的多条件判断
const complexRoutingRule = {
  name: 'complexRouting',
  priority: 80,
  condition: {
    type: 'externalFunction',
    externalFunction: {
      path: './external-rules/complex-routing.js',
      functionName: 'evaluateComplexCondition'
    }
  },
  action: {
    route: 'gemini-pro,google'
  }
};

// 将这些规则添加到配置中
export const externalRules = [
  printModelRequestDataRule,
  timeBasedRule,
  complexRoutingRule
];

// 配置更新函数
export function addExternalRulesToConfig(config) {
  // 合并外部规则到现有配置
  config.rules = [...(config.rules || []), ...externalRules];

  // 确保规则按优先级排序
  config.rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));

  return config;
}