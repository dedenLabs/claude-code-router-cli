export interface ProviderTransformer {
  use: (string | (string | Record<string, unknown> | { max_tokens: number })[])[];
  [key: string]: any; // Allow for model-specific transformers
}

export interface Provider {
  name: string;
  api_base_url: string;
  api_key: string;
  models: string[];
  transformer?: ProviderTransformer;
}

// 旧版路由配置接口（向后兼容）
export interface RouterConfig {
    default: string;
    background: string;
    think: string;
    longContext: string;
    longContextThreshold: number;
    webSearch: string;
    image: string;
    custom?: any;
}

// 统一路由引擎条件类型
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

// 统一路由引擎动作类型
export interface RouteAction {
    route: string;
    transformers?: string[];
    metadata?: Record<string, any>;
    description?: string; // 添加描述字段，支持配置文件中的description
}

// 统一路由引擎规则类型
export interface RouteRule {
    name: string;
    priority?: number;
    enabled?: boolean;
    condition: RouteCondition;
    action: RouteAction;
}

// 统一路由引擎配置接口
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

// 支持新旧格式的路由配置联合类型
export type AnyRouterConfig = RouterConfig | UnifiedRouterConfig;

export interface Transformer {
    name?: string;
    path: string;
    options?: Record<string, any>;
}

export interface StatusLineModuleConfig {
  type: string;
  icon?: string;
  text: string;
  color?: string;
  background?: string;
  scriptPath?: string; // 用于script类型的模块，指定要执行的Node.js脚本文件路径
}

export interface StatusLineThemeConfig {
  modules: StatusLineModuleConfig[];
}

export interface StatusLineConfig {
  enabled: boolean;
  currentStyle: string;
  default: StatusLineThemeConfig;
  powerline: StatusLineThemeConfig;
  fontFamily?: string;
}

export interface Config {
  Providers: Provider[];
  Router: AnyRouterConfig; // 支持新旧格式
  transformers: Transformer[];
  StatusLine?: StatusLineConfig;
  forceUseImageAgent?: boolean;
  // Top-level settings
  LOG: boolean;
  LOG_LEVEL: string;
  CLAUDE_PATH: string;
  HOST: string;
  PORT: number;
  APIKEY: string;
  API_TIMEOUT_MS: string;
  PROXY_URL: string;
  CUSTOM_ROUTER_PATH?: string;
}

export type AccessLevel = 'restricted' | 'full';
