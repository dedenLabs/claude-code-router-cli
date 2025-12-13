/**
 * 复杂路由规则示例
 * 演示如何组合多个条件进行路由决策
 */

/**
 * 评估复杂的路由条件
 * @param {RouteContext} context - 路由上下文
 * @returns {boolean} - 路由决策结果
 */
function evaluateComplexCondition(context) {
  // 获取请求信息
  const request = context.req;
  const messages = context.messages || [];
  const tools = context.tools || [];

  // 条件1：检查是否为复杂任务
  const isComplexTask = checkComplexity(messages);

  // 条件2：检查是否使用了特定工具
  const hasCodeTools = checkCodeTools(tools);

  // 条件3：检查token数量
  const hasLongContext = context.tokenCount > 10000;

  // 条件4：检查是否有系统指令
  const hasSystemInstruction = checkSystemInstruction(context);

  // 组合决策逻辑
  const score = calculateRouteScore({
    complexity: isComplexTask,
    hasCode: hasCodeTools,
    longContext: hasLongContext,
    hasSystem: hasSystemInstruction
  });

  console.log(`复杂路由评估:`, {
    complexity: isComplexTask,
    hasCode: hasCodeTools,
    longContext: hasLongContext,
    hasSystem: hasSystemInstruction,
    score
  });

  // 分数超过3分使用高级模型
  return score >= 3;
}

/**
 * 检查任务复杂度
 */
function checkComplexity(messages) {
  const userMessages = messages.filter(m => m.role === 'user');

  if (userMessages.length === 0) return false;

  const lastMessage = userMessages[userMessages.length - 1];
  const content = typeof lastMessage.content === 'string'
    ? lastMessage.content
    : lastMessage.content.map(item => item.text).join('');

  // 简单的复杂度指标
  const indicators = [
    content.includes('分析') || content.includes('设计'),
    content.includes('实现') || content.includes('开发'),
    content.includes('优化') || content.includes('重构'),
    content.length > 500, // 长文本
    (content.match(/[？?]/g) || []).length > 3 // 多个问题
  ];

  return indicators.filter(Boolean).length >= 2;
}

/**
 * 检查是否包含代码相关工具
 */
function checkCodeTools(tools) {
  const codeToolNames = ['code_interpreter', 'run_code', 'execute', 'bash', 'terminal'];
  return tools.some(tool => {
    const toolName = tool.type || tool.function?.name || '';
    return codeToolNames.includes(toolName);
  });
}

/**
 * 检查是否有系统指令
 */
function checkSystemInstruction(context) {
  if (!context.system || context.system.length === 0) return false;

  const systemText = typeof context.system[0] === 'string'
    ? context.system[0]
    : context.system[0]?.text || '';

  const instructionKeywords = ['请', '必须', '要求', '确保', '严格'];
  return instructionKeywords.some(keyword => systemText.includes(keyword));
}

/**
 * 计算路由分数
 */
function calculateRouteScore(factors) {
  let score = 0;

  if (factors.complexity) score += 1;
  if (factors.hasCode) score += 1;
  if (factors.longContext) score += 1;
  if (factors.hasSystem) score += 1;

  return score;
}

// 导出函数
module.exports = {
  evaluateComplexCondition
};