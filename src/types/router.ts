/**
 * 路由系统类型定义
 *
 * 定义了统一路由引擎所需的所有类型接口
 */

// ============================================================================
// Transformer 相关类型定义
// ============================================================================

/**
 * Transformer 配置选项
 */
export interface TransformerOptions {
  enabled?: boolean | string;
  debug?: boolean | string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  logToFile?: boolean;
  logToConsole?: boolean;
  logDir?: string;
}

/**
 * 消息接口
 */
export interface Message {
  role: string;
  content: string | ContentItem[];
}

/**
 * 内容项接口
 */
export interface ContentItem {
  type: string;
  text?: string;
}

/**
 * 请求接口
 */
export interface Request {
  model?: string;
  messages?: Message[];
  thinking?: ThinkingConfig;
  [key: string]: any;
}

/**
 * 思考配置接口
 */
export interface ThinkingConfig {
  type: string;
  category?: string;
}

/**
 * 思考类型
 */
export type ThinkingType = 'mathematical' | 'logical' | 'causal' | 'analytical' | 'creative' | 'strategic' | 'programming' | 'problem_solving' | false;

/**
 * Transformer 基类接口
 */
export interface ITransformer {
  name: string;
  enabled: boolean;
  transformRequestIn(request: Request): Promise<Request>;
  transformResponseOut(response: any): Promise<any>;
}

// ============================================================================
// 路由系统类型定义
// ============================================================================

export interface RouteCondition {
  type: 'tokenThreshold' | 'modelContains' | 'toolExists' | 'fieldExists' | 'custom' | 'externalFunction';
  field?: string;
  value?: any;
  operator?: 'gt' | 'lt' | 'eq' | 'contains' | 'startsWith' | 'exists';
  customFunction?: string;
  externalFunction?: {
    path: string;
    functionName?: string;
  };
}

export interface RouteAction {
  route: string;
  transformers?: string[];
  metadata?: Record<string, any>;
}

export interface RouteRule {
  name: string;
  priority?: number;
  enabled?: boolean;
  condition: RouteCondition;
  action: RouteAction;
}

export interface RouteContext {
  tokenCount: number;
  messages: any[];
  system: any[];
  tools: any[];
  sessionId?: string;
  lastUsage?: any;
  log: any;
  event?: any;
  req: any;
}

export interface RouteResult {
  route: string;
  matchedRule?: string;
  transformers?: string[];
  decisionTime: number;
  fromCache: boolean;
  metadata?: {
    context?: any;
    error?: string;
    fallback?: boolean;
  };
}

export interface RouteStats {
  totalRoutes: number;
  ruleMatches: Record<string, number>;
  cacheHits: number;
  cacheMisses: number;
  avgRouteTime: number;
  groupStats?: Record<string, any>;
}

export interface ConditionEvaluationResult {
  matches: boolean;
  value?: any;
  evaluationTime: number;
  error?: string;
}

export interface RuleMatchResult {
  matched: boolean;
  ruleName?: string;
  action?: RouteAction;
  priority?: number;
  evaluations: ConditionEvaluationResult[];
}

export interface LegacyRouterConfig {
  default?: string;
  background?: string;
  think?: string;
  longContext?: string;
  webSearch?: string;
  longContextThreshold?: number;
}

export interface UnifiedRouterConfig {
  engine: 'unified';
  defaultRoute: string;
  rules: RouteRule[];
  cache?: {
    enabled?: boolean;
    maxSize?: number;
    ttl?: number;
  };
  debug?: {
    enabled?: boolean;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    logToFile?: boolean;
    logToConsole?: boolean;
    logDir?: string;
  };
  contextThreshold?: {
    default?: number;
    longContext?: number;
  };
  migration?: {
    autoMigrate?: boolean;
    keepLegacy?: boolean;
  };
}

export interface MigrationResult {
  success: boolean;
  migrated: boolean;
  legacyConfig: LegacyRouterConfig;
  unifiedConfig: UnifiedRouterConfig;
  errors?: string[];
}

export interface LoadBalancingStrategy {
  type: 'round-robin' | 'least-connections' | 'random' | 'weighted';
  weights?: Record<string, number>;
}

export interface RouteInstance {
  id: string;
  route: string;
  status: 'healthy' | 'unhealthy' | 'draining';
  lastUsed?: number;
  connectionCount?: number;
  metadata?: Record<string, any>;
}

export interface InstanceManagerConfig {
  maxInstances?: number;
  healthCheckInterval?: number;
  healthCheckTimeout?: number;
  recoveryTimeout?: number;
  loadBalancing?: LoadBalancingStrategy;
}

export type InstanceStatus = 'healthy' | 'unhealthy' | 'draining';

export interface IUnifiedRouter {
  route(req: any, tokenCount: number, config: any, lastUsage?: any): Promise<string>;
  evaluate(req: any, tokenCount: number, config: any, lastUsage?: any): Promise<RouteResult>;
  addRule(rule: RouteRule): void;
  removeRule(ruleName: string): void;
  toggleRule(ruleName: string, enabled: boolean): void;
  getRules(): RouteRule[];
  clearCache(): void;
  getStats(): RouteStats;
  updateConfig(config: Partial<UnifiedRouterConfig>): void;
  getConfig(): UnifiedRouterConfig;
}

export interface IInstanceManager {
  addInstance(route: string, metadata?: Record<string, any>): string;
  removeInstance(instanceId: string): void;
  selectInstance(groupName: string): RouteInstance | null;
  updateInstanceStatus(instanceId: string, status: InstanceStatus): void;
  healthCheck(): Promise<void>;
  getInstances(): RouteInstance[];
}

export interface IGroupManager {
  addGroup(name: string, routes: string[], config?: InstanceManagerConfig): void;
  removeGroup(name: string): void;
  updateGroup(name: string, routes: string[], config?: InstanceManagerConfig): void;
  getGroup(name: string): any;
  selectInstance(groupName: string): RouteInstance | null;
  getGroups(): Record<string, any>;
}