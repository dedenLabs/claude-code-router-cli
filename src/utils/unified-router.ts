/**
 * 统一路由引擎
 *
 * 实现基于规则的路由决策，支持：
 * 1. 向后兼容的配置格式
 * 2. 多实例和组别管理
 * 3. 缓存和性能优化
 * 4. 友好的日志输出
 */

import {
  UnifiedRouterConfig,
  RouteRule,
  RouteCondition,
  RouteAction,
  RouteContext,
  RouteResult,
  RouteStats,
  RuleMatchResult,
  ConditionEvaluationResult,
  LegacyRouterConfig,
  MigrationResult,
  IUnifiedRouter,
} from "../types/router";
import { LRUCache } from "lru-cache";
import { Logger, createLogger } from "./logger";

/**
 * 统一路由引擎类
 */
export class UnifiedRouter implements IUnifiedRouter {
  private config: UnifiedRouterConfig;
  private rules: Map<string, RouteRule> = new Map();
  private cache: LRUCache<string, RouteResult>;
  private stats: RouteStats;
  private initialized: boolean = false;
  private logger: Logger;

  constructor(config: UnifiedRouterConfig) {
    this.config = config;
    this.rules = new Map();
    this.cache = new LRUCache({
      max: config.cache?.maxSize || 1000,
      ttl: config.cache?.ttl || 300000, // 5分钟
    });
    this.stats = this.initializeStats();

    // 初始化Logger
    this.logger = createLogger({
      enabled: config.debug?.enabled || false,
      logLevel: config.debug?.logLevel || "info",
      logToFile: config.debug?.logToFile,
      logToConsole: config.debug?.logToConsole == false ? false : true, // 确保控制台输出
      logDir: config.debug?.logDir,
    });

    this.loadRules();
    this.initialized = true;

    // 初始化完成日志
    this.logger.info("🚀 统一路由引擎初始化完成");
    this.logger.info(`   📋 默认路由: ${config.defaultRoute}`);
    this.logger.info(`   📊 加载规则数: ${config.rules?.length || 0}`);
    this.logger.info(
      `   💾 缓存功能: ${config.cache?.enabled !== false ? "已启用" : "已禁用"}`,
    );

    if (config.contextThreshold) {
      this.logger.info(
        `   📏 Token阈值: 默认=${config.contextThreshold.default}, 长上下文=${config.contextThreshold.longContext}`,
      );
    }
  }

  /**
   * 主要路由方法 - 实现IRouter接口
   */
  async route(
    req: any,
    tokenCount: number,
    config: any,
    lastUsage?: any,
  ): Promise<string> {
    const routeResult = await this.evaluate(req, tokenCount, config, lastUsage);
    return routeResult.route;
  }

  /**
   * 详细路由评估方法
   */
  async evaluate(
    req: any,
    tokenCount: number,
    config: any,
    lastUsage?: any,
  ): Promise<RouteResult> {
    const startTime = Date.now();
    const requestedModel = req.body?.model;
    const now = new Date(startTime);
    const timeStr = now.toLocaleString("zh-CN", {
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    this.logger.info(`\n🚀 ──────────────────────────────────────`);
    // 强制设置思考模式为 true (需要对象格式)
    // if (req.body) {
    //   req.body.thinking = { enabled: true };
    // }
    this.logger.info(
      `📝 用户请求开始 [${timeStr}] 🎯 目标模型: ${requestedModel || "default"}  ${(req.body?.thinking?.enabled && "💡模型选择思考:启用") || ""} ${req.body?.thinking ? JSON.stringify(req.body?.thinking) : ""}`,
    );
    this.logger.info(`🔗 请求ID: ${req.sessionId || "unknown"}`);

    // 将 config 挂载到 req 对象，供后续方法使用
    req.config = config;

    this.logger.debug("开始评估路由", { requestedModel, tokenCount });

    try {
      // 构建路由上下文
      const context: RouteContext = {
        tokenCount,
        messages: req.body?.messages || [],
        system: req.body?.system || [],
        tools: req.body?.tools || [],
        sessionId: req.sessionId,
        lastUsage,
        log: req.log || {
          info: this.logger.info.bind(this.logger),
          error: this.logger.error.bind(this.logger),
        },
        event: req.event,
        req,
      };

      // 按优先级评估规则
      const matchResult = await this.evaluateRules(context);

      // 处理路由变量替换
      let finalRoute =
        matchResult.matched && matchResult.action
          ? matchResult.action.route
          : this.config.defaultRoute;

      let finalMatchedRule = matchResult.matched
        ? matchResult.ruleName || "默认路由"
        : "默认路由";

      // 变量替换处理
      if (finalRoute.includes("${")) {
        const originalRoute = finalRoute;
        finalRoute = this.processVariableSubstitution(finalRoute, req, context);
        // 只有当变量替换后仍包含未替换的变量时，才回退到默认路由
        if (finalRoute.includes("${")) {
          finalMatchedRule = "默认路由";
        }
      } else {
        // 如果没有变量替换但匹配到了directMapping规则，也需要检查是否需要代号映射
        const requestedModel = req.body?.model;
        if (
          matchResult.matched &&
          matchResult.ruleName === "directMapping" &&
          requestedModel &&
          !requestedModel.includes(",")
        ) {
          const mappedRoute = this.mapDirectModelToProvider(
            requestedModel,
            req,
          );
          if (mappedRoute) {
            finalRoute = mappedRoute;
            // 只有当映射结果就是默认路由时，才将matchedRule设置为"默认路由"
            if (mappedRoute === this.config.defaultRoute) {
              finalMatchedRule = "默认路由";
            } else {
              finalMatchedRule = "directMapping";
            }
          } else {
            // 无法映射时使用默认路由
            finalRoute = this.config.defaultRoute;
            finalMatchedRule = "默认路由";
          }
        }
      }

      // 自动补全provider的模型信息（如果route只包含provider名称）
      finalRoute = this.resolveProviderModel(finalRoute, req, context, true);

      // 生成缓存键（使用最终的路由结果）
      const cacheKey = this.generateCacheKey(req, tokenCount, finalRoute);

      var result: RouteResult;
      // 检查缓存（基于配置决定是否启用）
      if (this.config.cache?.enabled !== false) {
        const cachedResult = this.cache.get(cacheKey);
        if (cachedResult) {
          this.logger.debug("使用缓存结果", { route: cachedResult.route });
          result = { ...cachedResult, fromCache: true };
        }
      }

      // 生成路由结果
      result = result || {
        route: finalRoute,
        matchedRule: finalMatchedRule,
        transformers: matchResult.action?.transformers || [],
        decisionTime: Date.now() - startTime,
        fromCache: false,
        metadata: {
          context: {
            tokenCount,
            hasTools: context.tools.length > 0,
            hasThinking: req.body?.thinking || false,
            sessionId: context.sessionId,
          },
        },
      };

      // 缓存结果（基于配置决定是否启用）
      if (this.config.cache?.enabled !== false) {
        this.cache.set(cacheKey, result);
      }

      // 更新统计信息
      this.updateStats(result, result.fromCache);

      // 用户友好的info级别日志
      const routeParts = finalRoute.split(",");
      const provider = routeParts[0];
      const model = routeParts[1] || "默认模型";

      // 显示路由决策信息
      if (finalMatchedRule === "默认路由") {
        // 如果使用默认路由，只显示简短信息
        this.logger.info(`🎯 使用默认路由 → ${provider}/${model}`);
      } else {
        // 如果匹配到特定规则，显示详细信息
        this.logger.info(`✨ 规则触发: ${finalMatchedRule}`);
        this.logger.info(
          `📍 路由决策: ${requestedModel} → ${provider}/${model}`,
        );
      }

      // 显示用户请求内容（最多3行）
      const userMessages = context.messages.filter(
        (msg) => msg.role === "user",
      );
      if (userMessages.length > 0) {
        const lastUserMessage = userMessages[userMessages.length - 1];
        let content = "";

        if (typeof lastUserMessage.content === "string") {
          content = lastUserMessage.content;
        } else if (Array.isArray(lastUserMessage.content)) {
          const textItems = lastUserMessage.content.filter(
            (item) => item.type === "text",
          );
          content = textItems.map((item) => item.text).join("");
        }

        if (content) {
          // 获取所有行
          const allLines = content.split("\n");
          const totalLines = allLines.length;

          if (totalLines <= 3) {
            // 如果总数只有3行内，直接全部打印
            this.logger.info(
              `📝 请求文本:\n ${allLines[0] || ""}${totalLines > 1 ? `\n${allLines[1] || ""}` : ""}${totalLines === 3 ? `\n${allLines[2] || ""}` : ""}`,
            );
          } else {
            // 超过3行，只显示前3行
            this.logger.info(
              `📝 请求文本:\n ${allLines[0] || ""}...\n${allLines[1] || ""}...\n${allLines[totalLines - 1] || ""}`,
            );
          }
        }
      }

      // // 特殊功能标注
      // if (req.body?.thinking) {
      //   this.logger.info(`💭 GLM思考模式已启用`);
      // }

      // Token数量提示
      if (context.tokenCount > 50000) {
        this.logger.info(
          `📊 Token使用量: ${context.tokenCount.toLocaleString()} (长上下文模式)`,
        );
      }

      // 调试模式下显示更多细节
      this.logger.debug("路由决策详情", {
        finalRoute,
        provider,
        model,
        decisionTime: result.decisionTime + "ms",
        fromCache: result.fromCache ? "是" : "否",
      });
      this.logger.info(`🚀 ──────────────────────────────────────`);
      return result;
    } catch (error: any) {
      this.logger.error(`❌ 路由评估失败: ${error.message}`);
      this.logger.debug("错误详情", {
        error: error.stack,
        requestedModel,
        stackTrace: error.stack?.split("\n"),
      });
      // 返回默认路由作为后备
      return {
        route: this.config.defaultRoute,
        decisionTime: Date.now() - startTime,
        fromCache: false,
        transformers: [],
        metadata: {
          error: error.message,
          fallback: true,
        },
      };
    }
  }

  /**
   * 评估所有路由规则
   */
  private async evaluateRules(context: RouteContext): Promise<RuleMatchResult> {
    const evaluations: ConditionEvaluationResult[] = [];

    // 获取按优先级排序的规则
    const allRules = Array.from(this.rules.values());
    const sortedRules = allRules
      .filter((rule) => rule.enabled !== false)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // 调试模式下显示规则评估过程
    if (this.config.debug?.enabled) {
      this.logger.debug("🔍 开始评估路由规则", {
        请求模型: context.req?.body?.model,
        Token数量: context.tokenCount,
        启用规则数: sortedRules.length,
        总规则数: allRules.length,
      });
    }

    if (sortedRules.length === 0) {
      this.logger.warn("⚠️ 没有启用的路由规则，将使用默认路由");
      return {
        matched: false,
        evaluations: [],
      };
    }

    for (const rule of sortedRules) {
      const evaluation = await this.evaluateCondition(rule.condition, context);
      evaluations.push(evaluation);

      // 调试模式下显示每个规则的评估结果
      if (this.config.debug?.enabled) {
        const conditionDesc = this.getConditionDescription(rule.condition);
        this.logger.debug(
          `  规则 "${rule.name}" (优先级: ${rule.priority || 0})`,
        );
        this.logger.debug(`    条件: ${conditionDesc}`);
        this.logger.debug(
          `    结果: ${evaluation.matches ? "✅ 匹配" : "❌ 不匹配"}`,
        );
      }

      if (evaluation.matches) {
        // console.log(`🎯 规则 "${rule.name}" 匹配成功，停止后续评估`);
        if (this.config.debug?.enabled) {
          this.logger.debug(`🎯 规则 "${rule.name}" 匹配成功，停止后续评估`);
        }
        return {
          matched: true,
          ruleName: rule.name,
          action: rule.action,
          priority: rule.priority,
          evaluations,
        };
      }
    }

    // 调试模式下显示没有规则匹配
    if (this.config.debug?.enabled) {
      this.logger.debug("➡️ 没有规则匹配，使用默认路由");
    }

    return {
      matched: false,
      evaluations,
    };
  }

  /**
   * 获取条件描述
   */
  private getConditionDescription(condition: RouteCondition): string {
    switch (condition.type) {
      case "tokenThreshold":
        return `Token数 ${condition.operator || "gt"} ${condition.value}`;
      case "modelContains":
        return `模型名 ${condition.operator || "contains"} "${condition.value}"`;
      case "toolExists":
        return `工具 "${condition.value}" 存在`;
      case "fieldExists":
        return `字段 "${condition.field}" 存在`;
      case "custom":
        return `自定义函数: ${condition.customFunction}`;
      case "externalFunction":
        return `外部函数: ${condition.externalFunction?.path || "未知路径"}`;
      default:
        return `未知条件类型: ${condition.type}`;
    }
  }

  /**
   * 评估单个条件
   */
  private async evaluateCondition(
    condition: RouteCondition,
    context: RouteContext,
  ): Promise<ConditionEvaluationResult> {
    const startTime = Date.now();

    this.logger.debug("评估条件", {
      conditionType: condition.type,
      condition: condition,
      requestedModel: context.req?.body?.model,
    });

    try {
      let matches = false;
      let value: any;

      switch (condition.type) {
        case "tokenThreshold":
          value = context.tokenCount;
          matches = this.compareNumbers(
            value,
            condition.value,
            condition.operator || "gt",
          );
          break;

        case "modelContains":
          value = context.req?.body?.model || "";
          matches = this.compareStrings(
            value,
            condition.value,
            condition.operator || "contains",
          );
          break;

        case "toolExists":
          value = context.tools.some(
            (tool: any) =>
              tool.type?.includes(condition.value) ||
              tool.function?.name?.includes(condition.value),
          );
          matches =
            condition.operator === "exists" ? value : value === condition.value;
          break;

        case "fieldExists":
          const fieldPath = condition.field!;
          const fieldValue = this.getFieldValue(context.req?.body, fieldPath);

          // console.log(`context.req?.body:`, JSON.stringify(context.req?.body));
          value = fieldValue;
          matches =
            condition.operator === "exists"
              ? fieldValue !== undefined && fieldValue !== null
              : condition.operator === "contains"
                ? fieldValue !== undefined &&
                  fieldValue !== null &&
                  String(fieldValue).includes(condition.value)
                : this.compareValues(
                    fieldValue,
                    condition.value,
                    condition.operator || "eq",
                  );
          break;

        case "custom":
          // console.log(`评估自定义条件: ${condition.customFunction}`, {
          //   model: context.req?.body?.model,
          //   condition
          // });
          matches = await this.evaluateCustomCondition(condition, context);
          value = matches;
          // console.log(`自定义条件结果: ${condition.customFunction} = ${matches}`);
          break;

        case "externalFunction":
          matches = await this.evaluateExternalFunction(condition, context);
          value = matches;
          break;

        default:
          throw new Error(`不支持的条件类型: ${condition.type}`);
      }

      const result = {
        matches,
        value,
        evaluationTime: Date.now() - startTime,
      };
      // console.log(`条件评估结果 [${condition.type || condition.customFunction}]:`, result);
      return result;
    } catch (error: any) {
      return {
        matches: false,
        evaluationTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  /**
   * 数字比较
   */
  private compareNumbers(
    actual: number,
    expected: number,
    operator: string,
  ): boolean {
    switch (operator) {
      case "gt":
        return actual > expected;
      case "lt":
        return actual < expected;
      case "eq":
        return actual === expected;
      default:
        return false;
    }
  }

  /**
   * 字符串比较
   */
  private compareStrings(
    actual: string,
    expected: string,
    operator: string,
  ): boolean {
    switch (operator) {
      case "contains":
        return actual.includes(expected);
      case "startsWith":
        return actual.startsWith(expected);
      case "eq":
        return actual === expected;
      default:
        return false;
    }
  }

  /**
   * 通用值比较
   */
  private compareValues(actual: any, expected: any, operator: string): boolean {
    switch (operator) {
      case "eq":
        return actual === expected;
      case "contains":
        return Array.isArray(actual)
          ? actual.includes(expected)
          : String(actual).includes(expected);
      default:
        return false;
    }
  }

  /**
   * 获取对象字段值（支持嵌套路径）
   */
  private getFieldValue(obj: any, fieldPath: string): any {
    const parts = fieldPath.split(".");
    let current = obj;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (current && typeof current === "object") {
        // 特殊处理：对于system消息，自动兼容content和text字段
        if (i === parts.length - 1 && part === "text" && current !== obj) {
          // 如果是system.X.text路径，优先尝试content，备选text
          const systemMessage = current;
          current = systemMessage?.content || systemMessage?.text;
        } else {
          current = current[part];
        }
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * 评估自定义条件
   */
  private async evaluateCustomCondition(
    condition: RouteCondition,
    context: RouteContext,
  ): Promise<boolean> {
    const { customFunction } = condition;

    switch (customFunction) {
      case "modelContainsComma":
        return context.req?.body?.model?.includes(",") || false;

      case "directProviderMapping":
      case "directModelMapping": // 兼容旧版本名称
        const model = context.req?.body?.model;
        if (!model || model.includes(",")) {
          return false;
        }

        // 验证模型或provider是否存在于配置中
        const providers = context.req?.config?.Providers || [];
        const modelStr = String(model).toLowerCase();

        // 1. 尝试作为模型名查找（遍历所有providers的models数组）
        for (const provider of providers) {
          if (provider.models && Array.isArray(provider.models)) {
            if (
              provider.models.some((m) => String(m).toLowerCase() === modelStr)
            ) {
              return true;
            }
          }
          if (String(provider.model || "").toLowerCase() === modelStr) {
            return true;
          }
        }

        // 2. 尝试作为provider名称查找
        const matchedProvider = providers.find(
          (p: any) => String(p.name).toLowerCase() === modelStr,
        );
        if (matchedProvider) {
          return true;
        }

        // 模型和provider都不存在，匹配失败
        return false;

      default:
        this.logger.warn(`未知的自定义条件函数: ${customFunction}`);
        return false;
    }
  }

  /**
   * 评估外部函数条件
   */
  private async evaluateExternalFunction(
    condition: RouteCondition,
    context: RouteContext,
  ): Promise<boolean> {
    const { externalFunction } = condition;

    if (!externalFunction || !externalFunction.path) {
      this.logger.warn("外部函数条件缺少路径信息");
      return false;
    }

    try {
      // 动态导入外部函数
      const externalModule = await import(condition.externalFunction!.path);

      // 优先查找配置文件中指定的方法名
      const functionName = condition.externalFunction!.functionName;
      let conditionFunction;

      if (functionName && externalModule[functionName]) {
        // 1. 优先使用配置文件中指定的方法名
        conditionFunction = externalModule[functionName];
      } else if (externalModule.default) {
        // 2. 如果指定的方法名不存在，使用默认导出
        conditionFunction = externalModule.default;
      } else if (externalModule["evaluate"]) {
        // 3. 如果默认导出也不存在，使用默认方法名 "evaluate"
        conditionFunction = externalModule["evaluate"];
      } else {
        // 4. 都不存在则返回 undefined，后续会报错
        conditionFunction = undefined;
      }

      if (typeof conditionFunction !== "function") {
        this.logger.error(
          `外部函数 ${condition.externalFunction!.path} 不是一个有效的函数`,
        );
        return false;
      }

      // 执行外部函数，传入上下文
      this.logger.debug(`执行外部函数: ${condition.externalFunction!.path}`);
      const result = await conditionFunction(context, condition);
      // // user-check.js
      // function checkUserType(context, condition) {
      //   const email = context.req?.headers?.['x-user-email'];
      //   return email && email.endsWith('@company.com');
      // }

      // module.exports = { checkUserType };

      // 确保返回布尔值
      const matches = Boolean(result);
      this.logger.debug(`外部函数结果: ${matches}`);

      return matches;
    } catch (error: any) {
      this.logger.error(`执行外部函数失败: ${error.message}`, {
        externalPath: condition.externalFunction!.path,
        functionName: condition.externalFunction!.functionName,
        error: error.stack,
      });
      return false;
    }
  }

  /**
   * 处理变量替换
   */
  private processVariableSubstitution(
    route: string,
    req: any,
    context: RouteContext,
  ): string {
    let processedRoute = route;

    // 处理 ${userModel} - 用户原始指定的模型
    if (processedRoute.includes("${userModel}")) {
      const userModel = req.body?.model;
      if (userModel) {
        processedRoute = processedRoute.replace(/\$\{userModel\}/g, userModel);
      } else {
        this.logger.warn("${userModel} 变量替换失败，未找到原始用户模型");
        processedRoute = this.config.defaultRoute;
      }
    }

    // 处理 ${subagent} - 从系统消息中提取的子代理模型
    if (processedRoute.includes("${subagent}")) {
      // 尝试从所有系统消息中查找子代理模型标记
      let systemText = "";
      const systemMessages = req.body?.system || [];

      for (let i = 0; i < systemMessages.length; i++) {
        const content =
          systemMessages[i]?.content || systemMessages[i]?.text || "";
        if (content.includes("<CCR-SUBAGENT-MODEL>")) {
          systemText = content;
          break;
        }
      }

      const match = systemText.match(
        /<CCR-SUBAGENT-MODEL>(.*?)<\/CCR-SUBAGENT-MODEL>/,
      );

      if (match && match[1]) {
        processedRoute = processedRoute.replace(/\$\{subagent\}/g, match[1]);
      } else {
        this.logger.warn("${subagent} 变量替换失败，未找到子代理模型标记");
        processedRoute = this.config.defaultRoute;
      }
    }

    // 处理 ${mappedModel} - 将provider作为代号，映射到对应的model模型
    if (processedRoute.includes("${mappedModel}")) {
      const userModel = req.body?.model;
      if (userModel && !userModel.includes(",")) {
        const mappedRoute = this.mapDirectModelToProvider(userModel, req);
        if (mappedRoute && mappedRoute !== this.config.defaultRoute) {
          processedRoute = processedRoute.replace(
            /\$\{mappedModel\}/g,
            mappedRoute,
          );
        } else {
          this.logger.warn(
            `\${mappedModel} 变量替换失败，未找到模型 ${userModel} 的有效映射`,
          );
          // 不回退到默认路由，保持原始变量让上游处理
        }
      } else {
        this.logger.warn("${mappedModel} 变量替换失败，用户模型格式不正确");
        // 不回退到默认路由，保持原始变量让上游处理
      }
    }

    if (route !== processedRoute) {
      this.logger.debug("🔄 变量替换完成", {
        原始路由: route,
        最终路由: processedRoute,
      });
    }

    // 如果还有未替换的变量，保持原样返回，让上游调用方决定是否使用默认路由
    if (processedRoute.includes("${")) {
      // 对于 ${subagent} 变量，如果替换失败则保持原样
      if (processedRoute.includes("${subagent}")) {
        this.logger.debug("${subagent} 变量替换失败，保持原样");
        return processedRoute;
      }
      // 对于其他变量（如 ${mappedModel}、${userModel}），同样保持原样
      // 不回退到默认路由，由调用方根据规则匹配情况决定处理方式
      this.logger.debug(
        `变量替换未完成，仍包含未替换的变量: ${processedRoute}，保持原样返回`,
      );
      return processedRoute;
    }

    return processedRoute;
  }

  /**
   * 将provider名称或模型名称转换为完整的 "provider,model" 路由格式
   *
   * 支持两种输入模式：
   * 1. 模型名映射：如 "claude-3.5-sonnet" → "openrouter,claude-3.5-sonnet"
   * 2. Provider名称补全：如 "haiku-glm" → "haiku-glm,glm-4.7"
   *
   * @param input - 模型名称或provider名称
   * @param req - 请求对象，包含config.Providers配置
   * @param context - 路由上下文（可选）
   * @param fallbackToInput - 失败时是否返回原输入（用于规则路由），默认false
   * @returns 完整的 "provider,model" 路由，或null表示无法映射
   */
  private resolveProviderModel(
    input: string,
    req: any,
    context?: RouteContext,
    fallbackToInput = false,
  ): string | null {
    // 如果输入已经是完整的 "provider,model" 格式，直接返回
    if (input.includes(",")) {
      return input;
    }

    const providers = req.config?.Providers || [];
    this.logger.debug("尝试provider模型解析", {
      input,
      providersCount: providers.length,
    });

    // 第一步：尝试作为模型名查找（遍历所有providers的models数组）
    for (const provider of providers) {
      // 检查models数组
      if (provider.models && Array.isArray(provider.models)) {
        if (provider.models.includes(input)) {
          const route = `${provider.name},${provider.models[0]}`;
          this.logger.info("✓ 模型名匹配", {
            request: input,
            route: route,
          });
          return route;
        }
      }

      // 检查单个model字段
      if (provider.model === input) {
        const route = `${provider.name},${provider.model}`;
        this.logger.info("✓ 模型名匹配", {
          request: input,
          route: route,
        });
        return route;
      }
    }

    // 第二步：尝试作为provider名称查找
    this.logger.debug("未找到模型名，尝试作为provider名称匹配", { input });
    const matchedProvider = providers.find(
      (p: any) => p.name.toLowerCase() === input.toLowerCase(),
    );

    if (!matchedProvider) {
      this.logger.debug(`未找到provider '${input}' 的配置`);
      if (fallbackToInput) {
        this.logger.debug(`fallback模式：保持原样返回 ${input}`);
        return input;
      }
      return null;
    }

    // 第三步：获取该provider的模型（优先defaultModel，备选第一个模型）
    let model: string | undefined;

    // 优先：defaultModel字段
    if (matchedProvider.defaultModel) {
      model = matchedProvider.defaultModel;
      this.logger.info(`✓ 使用provider '${input}' 的默认模型: ${model}`);
    }
    // 备选：models数组的第一个
    else if (matchedProvider.models && matchedProvider.models.length > 0) {
      model = matchedProvider.models[0];
      this.logger.info(`✓ 使用provider '${input}' 的第一个模型: ${model}`);
    }
    // 备选：单个model字段
    else if (matchedProvider.model) {
      model = matchedProvider.model;
      this.logger.info(`✓ 使用provider '${input}' 的模型: ${model}`);
    }

    if (model) {
      return `${matchedProvider.name},${model}`;
    }

    this.logger.error(`Provider '${input}' 没有配置任何模型`);
    if (fallbackToInput) {
      this.logger.debug(`fallback模式：保持原样返回 ${input}`);
      return input;
    }
    return null;
  }

  /**
   * 将provider作为代号，映射到对应的model模型（旧方法别名）
   * @deprecated 使用 resolveProviderModel 替代
   */
  private mapDirectModelToProvider(modelName: string, req: any): string | null {
    return this.resolveProviderModel(modelName, req);
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(
    req: any,
    tokenCount: number,
    finalRoute: string,
  ): string {
    return JSON.stringify({
      model: req.body?.model,
      route: finalRoute,
      tokenCount,
      hasTools: req.body?.tools?.length > 0,
      hasSystem: !!req.body?.system,
      thinking: req.body?.thinking || false,
      sessionId: req.sessionId,
    });
  }

  /**
   * 加载规则到内存
   */
  private loadRules(): void {
    for (const rule of this.config.rules) {
      this.rules.set(rule.name, rule);
    }
  }

  /**
   * 初始化统计信息
   */
  private initializeStats(): RouteStats {
    return {
      totalRoutes: 0,
      ruleMatches: {},
      cacheHits: 0,
      cacheMisses: 0,
      avgRouteTime: 0,
      groupStats: {},
    };
  }

  /**
   * 更新统计信息
   */
  private updateStats(result: RouteResult, fromCache: boolean): void {
    this.stats.totalRoutes++;

    if (fromCache) {
      this.stats.cacheHits++;
    } else {
      this.stats.cacheMisses++;
      if (result.matchedRule) {
        this.stats.ruleMatches[result.matchedRule] =
          (this.stats.ruleMatches[result.matchedRule] || 0) + 1;
      }
    }

    // 更新平均路由时间
    this.stats.avgRouteTime =
      (this.stats.avgRouteTime * (this.stats.totalRoutes - 1) +
        result.decisionTime) /
      this.stats.totalRoutes;
  }

  // IUnifiedRouter 接口方法实现
  addRule(rule: RouteRule): void {
    this.logger.debug(`添加规则: ${rule.name}`);

    // 检查规则是否已存在
    const existingIndex = this.config.rules.findIndex(
      (r) => r.name === rule.name,
    );
    if (existingIndex >= 0) {
      this.config.rules[existingIndex] = rule;
    } else {
      this.config.rules.push(rule);
    }
    this.loadRules();
  }

  removeRule(ruleName: string): void {
    this.logger.debug(`移除规则: ${ruleName}`);
    this.rules.delete(ruleName);
    this.config.rules = this.config.rules.filter((r) => r.name !== ruleName);
  }

  toggleRule(ruleName: string, enabled: boolean): void {
    const rule = this.rules.get(ruleName);
    if (rule) {
      rule.enabled = enabled;

      const configRule = this.config.rules.find((r) => r.name === ruleName);
      if (configRule) {
        configRule.enabled = enabled;
      }
    }
  }

  getRules(): RouteRule[] {
    return Array.from(this.rules.values());
  }

  clearCache(): void {
    this.cache.clear();
  }

  getStats(): RouteStats {
    return { ...this.stats };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<UnifiedRouterConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.rules) {
      this.rules.clear();
      this.loadRules();
    }
  }

  /**
   * 获取配置
   */
  getConfig(): UnifiedRouterConfig {
    return { ...this.config };
  }
}

/**
 * 从传统配置迁移到统一配置
 */
export function migrateLegacyConfig(
  legacy: LegacyRouterConfig,
): UnifiedRouterConfig {
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
        operator: "gt",
      },
      action: {
        route: legacy.longContext,
        transformers: [],
        description: "长上下文路由：基于token阈值选择模型",
      },
    });
  }

  // 子代理规则 - 兼容content和text字段
  rules.push({
    name: "subagent",
    priority: 90,
    enabled: true,
    condition: {
      type: "fieldExists",
      field: "system.1.text",
      operator: "contains",
      value: "<CCR-SUBAGENT-MODEL>",
    },
    action: {
      route: "${subagent}",
      transformers: [],
      description: "子代理路由：通过特殊标记选择模型",
    },
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
        operator: "contains",
      },
      action: {
        route: legacy.background,
        transformers: [],
        description: "后台路由：Haiku模型自动使用轻量级模型",
      },
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
        operator: "exists",
      },
      action: {
        route: legacy.webSearch,
        transformers: [],
        description: "网络搜索路由：检测到web_search工具时使用特定模型",
      },
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
        operator: "exists",
      },
      action: {
        route: legacy.think,
        transformers: [],
        description: "思考模式路由：检测thinking参数时使用特定模型",
      },
    });
  }

  // Provider直接映射规则（兼容旧版本配置）
  rules.push({
    name: "directMapping",
    priority: 50,
    enabled: true,
    condition: {
      type: "custom",
      customFunction: "directProviderMapping", // 新名称，兼容旧版本使用 directModelMapping
    },
    action: {
      route: "${mappedModel}",
      transformers: [],
      description: "Provider映射：验证并映射provider名称到其默认模型",
    },
  });

  // 用户指定模型规则（包含逗号的provider,model格式）
  rules.push({
    name: "userSpecified",
    priority: 40,
    enabled: true,
    condition: {
      type: "custom",
      customFunction: "modelContainsComma",
    },
    action: {
      route: "${userModel}",
      transformers: [],
      description: "用户指定路由：用户在请求中直接指定provider,model格式",
    },
  });

  return {
    engine: "unified",
    defaultRoute: legacy.default || "",
    rules,
    cache: {
      enabled: true,
      maxSize: 1000,
      ttl: 300000,
    },
    debug: {
      enabled: false,
      logLevel: "info",
      logToFile: true,
      logToConsole: true,
    },
    contextThreshold: {
      default: 1000,
      longContext: legacy.longContextThreshold || 60000,
    },
  };
}
