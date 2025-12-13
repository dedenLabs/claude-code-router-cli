/**
 * 用户偏好路由规则
 * 根据用户的系统消息中保存的偏好设置进行路由
 */

// 模拟用户偏好数据库
const userPreferences = {
  'user@example.com': {
    preferredModel: 'gpt-4',
    provider: 'openai'
  },
  'admin@example.com': {
    preferredModel: 'claude-3-opus',
    provider: 'anthropic'
  }
};

/**
 * 检查用户偏好
 * @param {RouteContext} context - 路由上下文
 * @returns {boolean} - 是否匹配用户偏好
 */
function checkUserPreference(context) {
  // 从系统消息或会话信息中提取用户标识
  const userEmail = extractUserEmail(context);

  if (!userEmail) {
    console.log(`无法识别用户邮箱，使用默认路由`);
    return false;
  }

  const preference = userPreferences[userEmail];
  if (!preference) {
    console.log(`用户 ${userEmail} 没有设置偏好，使用默认路由`);
    return false;
  }

  // 记录匹配结果
  console.log(`用户偏好匹配: ${userEmail} -> ${preference.provider}/${preference.preferredModel}`);
  return true;
}

/**
 * 从上下文中提取用户邮箱
 */
function extractUserEmail(context) {
  // 尝试从多个可能的来源获取用户邮箱
  if (context.req?.headers?.['x-user-email']) {
    return context.req.headers['x-user-email'];
  }

  if (context.sessionId && context.sessionId.includes('@')) {
    return context.sessionId;
  }

  // 可以从系统消息中解析
  if (context.system && context.system[0]?.text) {
    const emailMatch = context.system[0].text.match(/user:\s*([^\s]+)/);
    if (emailMatch) {
      return emailMatch[1];
    }
  }

  return null;
}

// 导出函数
module.exports = {
  checkUserPreference
};