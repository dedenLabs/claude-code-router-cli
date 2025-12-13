/**
 * GLM Thinking Transformer
 * 为智谱GLM模型启用thinking模式
 */

import {
  TransformerOptions,
  Message,
  ContentItem,
  Request,
  ThinkingConfig,
  ThinkingType,
  ITransformer
} from '../types/router';

/**
 * GLM思考模式转换器类
 */
class GLMThinkingTransformer implements ITransformer {
  public name: string;
  public enabled: boolean;
  private debug: boolean;

  constructor(options: TransformerOptions = {}) {
    this.name = "glm-thinking";
    this.enabled = options.enabled !== "false" && options.enabled !== false;
    this.debug = (options.debug !== "false" && options.debug !== false) || false;

    console.log('💡GLM思考模式转换器已激活', { enabled: this.enabled });
  }

  /**
   * 检测思维链类型
   */
  detectThinkingType(prompt: string): ThinkingType {
    const keywords: Record<string, string[]> = {
      mathematical: ['计算', '数学', '公式', '方程', '几何', '代数', 'calculate', 'math', 'formula', '求解', '函数', '积分', '导数', '极限', '证明题'],
      logical: ['逻辑', '推理', '证明', '演绎', '归纳', 'logic', 'reasoning', 'proof', '推断', '假设', '结论'],
      causal: ['原因', '结果', '因果', '影响', '导致', 'cause', 'effect', 'impact', '分析', '预测', '关系'],
      analytical: ['分析', '分解', '评估', '判断', 'analyze', 'evaluate', 'assess', '比较', '总结', '优缺点'],
      creative: ['创意', '创新', '想象', '设计', 'creative', 'innovative', 'design', '构思', '优化', '改进'],
      strategic: ['策略', '计划', '决策', '选择', 'strategy', 'plan', 'decision', '方案', '建议', '规划'],
      programming: ['代码', '编程', '算法', '程序', 'code', 'algorithm', 'function', '实现', '开发', '调试'],
      problem_solving: ['问题', '解决', '方法', '步骤', 'problem', 'solve', 'solution', '思路', '流程']
    };

    // 检查每种类型的关键词
    for (const [type, words] of Object.entries(keywords)) {
      const matchedWords: string[] = [];
      const matchCount = words.filter(word => {
        if (prompt.toLowerCase().includes(word.toLowerCase())) {
          matchedWords.push(word);
          return true;
        }
        return false;
      }).length;

      // 如果匹配到关键词，返回该类型
      if (matchCount > 0) {
        // console.log(`检测到${type}类型思维`, {
        //   matchedWords: matchedWords.join(','),
        //   matchCount
        // });
        return type as ThinkingType;
      }
    }

    // 如果没有匹配到关键词，检查是否需要复杂推理
    if (this.requiresComplexReasoning(prompt)) {
      // console.log('检测到复杂推理需求');
      return 'logical';
    }

    return false;
  }

  /**
   * 判断是否需要复杂推理
   */
  requiresComplexReasoning(prompt: string): boolean {
    const complexityIndicators = [
      '步骤', '流程', '过程', '方法', '思路', '详细', '解释',
      '为什么', '如何', '怎样', '如果', '那么', '首先', '其次', '最后',
      '比较', '对比', '选择', '判断', '考虑', '综合', '总结'
    ];

    return complexityIndicators.some(indicator =>
      prompt.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  /**
   * 获取用户消息内容
   */
  getUserMessage(request: Request): string {
    const messages = request.messages || [];
    const lastMessage = messages[messages.length - 1];

    if (!lastMessage || lastMessage.role !== 'user') {
      return '';
    }

    // 处理多模态消息
    if (Array.isArray(lastMessage.content)) {
      return lastMessage.content
        .filter(item => item.type === 'text')
        .map(item => item.text || '')
        .join('\n');
    }

    return lastMessage.content as string || '';
  }

  /**
   * 转换请求输入 - 添加thinking参数
   */
  async transformRequestIn(request: Request): Promise<Request> {
    if (!this.enabled) return request;

    try {
      // 如果禁用，确保移除thinking参数
      const { thinking, ...requestWithoutThinking } = request;

      const userMessage = this.getUserMessage(requestWithoutThinking);

      // console.log('处理GLM思考请求', {
      //   enabled: this.enabled,
      //   messageLength: userMessage.length
      // });

      // 检查是否需要启用thinking模式
      if (this.enabled) {
        const thinkingType = this.detectThinkingType(userMessage);

        if (thinkingType) {
          console.log(`💡 GLM思考中... 启用${thinkingType}类型思维模式`);

          // 为智谱GLM模型添加thinking参数
          return {
            ...requestWithoutThinking,
            thinking: {
              type: "enabled",
              category: thinkingType
            }
          };
        }
      }

      return requestWithoutThinking;
    } catch (error: any) {
      console.error('转换请求时发生错误', {
        error: error.message,
        stack: error.stack
      });
      return request;
    }
  }

  /**
   * 转换响应输出 - 处理thinking响应
   * 目前暂未实现，预留接口
   */
  async transformResponseOut(response: any): Promise<any> {
    // 暂未实现响应转换
    // 可以在这里对thinking响应进行后处理
    return response;
  }
}
module.exports = GLMThinkingTransformer;
