/**
 * 调试日志外部路由脚本
 *
 * 专门用于打印模型请求数据的外部路由函数
 * 优先级最高，但不拦截任何请求（始终返回false）
 *
 * 特性：
 * - 变量式日志收集：每种日志类型单独存储
 * - 选择性输出：用户可指定要输出的日志类型
 * - 文件存储：增量写入到 ~/.claude-code-router/logs/
 * - 时间戳：每个日志条目带时间标记
 * - 折叠友好：支持编辑器折叠功能
 *
 * 使用方式：
 * 1. 在配置中添加此外部规则
 * 2. 设置最高优先级（999）
 * 3. 该函数会收集所有请求数据但不拦截
 */

const fs = require('fs');
const path = require('path');
const util = require('util');
const os = require('node:os');



/**
 * 打印详细的模型请求数据
 * @param {RouteContext} context - 路由上下文，包含完整的请求信息
 * @returns {boolean} - 始终返回false，不拦截路由
 */
function printModelRequestData(context) {
  // ========== 收集日志 ==========
  // 修改下面的数组来选择要输出的日志类型
  // 可选值: 'basic', 'headers', 'messages', 'system', 'tools', 'body', 'usage', 'event'
  const outputTypes = [
    'body',
    // 'basic',
    // 'headers',
    // 'messages',
    // 'system',
    // 'tools',
    // 'usage',
    // 'event'
  ];
  // 是否写入到日志文件 `~/.claude-code-router/logs/*.log`
  const logToFile = true;
  // 是否输出到控制台
  const logToConsole = false;


  // ========== 直接收集日志 ==========
  // 保留变量名，但将逻辑直接写在这里，方便修改和检查

  // 基本信息
  let basicInfo = '';
  basicInfo += '📊 【基本信息】\n';
  basicInfo += `  Token 数量: ${context.tokenCount}\n`;
  basicInfo += `  会话ID: ${context.sessionId || 'N/A'}\n`;

  // 请求头信息
  let headersMsg = '';
  if (context.req?.headers) {
    headersMsg += '📋 【请求头】\n';
    const headers = context.req.headers;
    Object.keys(headers).forEach(key => {
      headersMsg += `  ${key}: ${headers[key]}\n`;
    });
  }

  // 消息内容
  let messages = '';
  if (context.messages && context.messages.length > 0) {
    messages += `💬 【消息内容】(共 ${context.messages.length} 条)\n`;

    context.messages.forEach((message, index) => {
      messages += `\n  [消息 ${index + 1}]\n`;
      messages += `    Role: ${message.role}\n`;

      // 处理内容
      if (message.content) {
        if (typeof message.content === 'string') {
          const preview = message.content.substring(0, 200);
          messages += `    Content: ${preview}${message.content.length > 200 ? '...' : ''}\n`;
        } else if (Array.isArray(message.content)) {
          messages += `    Content (多部分):\n`;
          message.content.forEach((part, partIndex) => {
            messages += `      [${partIndex}] Type: ${part.type}\n`;
            if (part.type === 'text') {
              const preview = part.text?.substring(0, 100) || '';
              messages += `           Text: ${preview}${part.text?.length > 100 ? '...' : ''}\n`;
            } else if (part.type === 'image_url') {
              messages += `           Image URL: ${part.image_url?.url || 'N/A'}\n`;
            }
          });
        }
      }

      // 处理工具调用
      if (message.tool_calls && message.tool_calls.length > 0) {
        messages += `    Tool Calls (${message.tool_calls.length} 个):\n`;
        message.tool_calls.forEach((toolCall, toolIndex) => {
          messages += `      [${toolIndex}] ${toolCall.name}(${toolCall.id})\n`;
          messages += `           Args: ${JSON.stringify(toolCall.arguments, null, 2)}\n`;
        });
      }
    });
  }

  // 系统消息
  let systemMessages = '';
  if (context.system && context.system.length > 0) {
    systemMessages += `⚙️ 【系统消息】(共 ${context.system.length} 条)\n`;

    context.system.forEach((sysMsg, index) => {
      systemMessages += `\n  [系统消息 ${index + 1}]\n`;
      if (sysMsg.content) {
        const preview = sysMsg.content.substring(0, 300);
        systemMessages += `    Content: ${preview}${sysMsg.content.length > 300 ? '...' : ''}\n`;
      }
      if (sysMsg.type) {
        systemMessages += `    Type: ${sysMsg.type}\n`;
      }
      if (sysMsg.name) {
        systemMessages += `    Name: ${sysMsg.name}\n`;
      }
    });
  }

  // 可用工具
  let tools = '';
  if (context.tools && context.tools.length > 0) {
    tools += `🔧 【可用工具】(共 ${context.tools.length} 个)\n`;

    context.tools.forEach((tool, index) => {
      tools += `\n  [${index + 1}] ${tool.name}\n`;
      tools += `    Description: ${tool.description || 'N/A'}\n`;
      if (tool.input_schema) {
        tools += `    Input Schema: ${JSON.stringify(tool.input_schema, null, 2)}\n`;
      }
    });
  }

  // 请求体原始数据
  let requestBody = '';
  if (context.req) {
    requestBody += '📦 【请求体原始数据】\n';

    // 安全地打印请求信息，避免循环引用和修改原始数据
    const safeReq = {
      method: context.req.method,
      url: context.req.url,
      headers: context.req.headers,
      body: context.req.body,
      httpVersion: context.req.httpVersion,
      socket: context.req.socket ? '[Socket Object]' : undefined
    };

    // 创建 body 的深拷贝，避免修改原始数据
    if (safeReq.body) {
      safeReq.body = { ...safeReq.body };
      // 清理可能过大的字段（仅在副本上操作）
      if (safeReq.body.messages) {
        safeReq.body.messages = `[包含 ${safeReq.body.messages.length} 条消息的数组]`;
      }
      if (safeReq.body.system) {
        safeReq.body.system = `[包含 ${safeReq.body.system.length} 条系统消息的数组]`;
      }
      if (safeReq.body.tools) {
        safeReq.body.tools = `[包含 ${safeReq.body.tools.length} 个工具定义的数组]`;
      }
    }

    requestBody += util.inspect(safeReq, { depth: null, colors: false, breakLength: Infinity }) + '\n';
  }

  // 使用统计
  let usageStats = '';
  if (context.lastUsage) {
    usageStats += '📈 【使用统计】\n';
    usageStats += `  输入 tokens: ${context.lastUsage.input_tokens || 0}\n`;
    usageStats += `  输出 tokens: ${context.lastUsage.output_tokens || 0}\n`;
    usageStats += `  总 tokens: ${context.lastUsage.total_tokens || 0}\n`;
    if (context.lastUsage.cost) {
      usageStats += `  估算成本: $${context.lastUsage.cost}\n`;
    }
  }

  // 事件信息
  let eventInfo = '';
  if (context.event) {
    eventInfo += '🎯 【事件信息】\n';
    eventInfo += util.inspect(context.event, { depth: 2, colors: false }) + '\n';
  }

  // ========== 生成完整日志 ==========
  let fullLog = '\n========================================\n';
  fullLog += '🔍 【调试日志】模型请求数据\n';
  fullLog += '========================================\n\n';

  // 根据选择输出日志
  if (outputTypes.includes('basic')) fullLog += basicInfo + '\n';
  if (outputTypes.includes('headers') && headersMsg) fullLog += headersMsg + '\n';
  if (outputTypes.includes('messages') && messages) fullLog += messages + '\n';
  if (outputTypes.includes('system') && systemMessages) fullLog += systemMessages + '\n';
  if (outputTypes.includes('tools') && tools) fullLog += tools + '\n';
  if (outputTypes.includes('body') && requestBody) fullLog += requestBody + '\n';
  if (outputTypes.includes('usage') && usageStats) fullLog += usageStats + '\n';
  if (outputTypes.includes('event') && eventInfo) fullLog += eventInfo + '\n';

  fullLog += '========================================\n';
  fullLog += '✅ 【调试日志】打印完成 - 路由继续执行\n';
  fullLog += '========================================\n\n';

  // ========== 输出方式 ==========
  // 1. 输出到控制台
  if (logToConsole) console.log(fullLog);

  // 2. 写入到日志文件（增量追加） 
  if (logToFile) writeLogToFile(fullLog);

  // 始终返回 false，不拦截任何路由
  return false;
}

/**
 * 日志文件路径
 */
const getLogFilePath = () => {
  const logDir = path.join(os.homedir(), '.claude-code-router', 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(logDir, `debug-logger-${timestamp}.log`);
};

/**
 * 写入日志到文件（增量追加）
 * @param {string} content - 日志内容
 */
function writeLogToFile(content) {
  try {
    const logFile = getLogFilePath();
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${content}\n`;
    fs.appendFileSync(logFile, logEntry, 'utf8');
  } catch (error) {
    console.error('❌ 写入日志文件失败:', error.message);
  }
}

// 导出函数
module.exports = { printModelRequestData };
