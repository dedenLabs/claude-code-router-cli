export interface UnifiedMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string | null | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

export interface UnifiedTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export type ThinkLevel = "none" | "low" | "medium" | "high";

export interface UnifiedChatRequest {
  messages: UnifiedMessage[];
  model: string;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: UnifiedTool[];
  tool_choice?: "auto" | "none" | "required" | { type: "function"; function: { name: string } };
  reasoning?: {
    effort?: ThinkLevel;
    max_tokens?: number;
    enabled?: boolean;
  };
}

export interface LLMProvider {
  name: string;
  baseUrl: string;
  apiKey: string;
  models: string[];
  transformer?: {
    use?: any[];
  } & {
    [key: string]: { use?: any[] };
  };
}

export type RegisterProviderRequest = LLMProvider;

export interface ModelRoute {
  provider: string;
  model: string;
  fullModel: string;
}

export interface RequestRouteInfo {
  provider: LLMProvider;
  originalModel: string;
  targetModel: string;
}

export interface ConfigProvider {
  name: string;
  api_base_url: string;
  api_key: string;
  models: string[];
  transformer: {
    use?: string[] | Array<any>[];
  } & { [key: string]: { use?: string[] | Array<any>[] } };
}
