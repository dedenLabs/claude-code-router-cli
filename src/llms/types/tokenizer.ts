import { TiktokenTokenizer } from "./tiktoken-tokenizer";

export interface ITokenizer {
  name: string;
  type: string;
  initialize(): Promise<void>;
  countTokens(request: TokenizeRequest): Promise<number>;
  dispose(): void;
}

export interface TokenizeRequest {
  messages?: Array<{ role: string; content: string | Array<any> }>;
  system?: string | Array<any>;
  tools?: Array<any>;
}

export interface TokenizerConfig {
  type: "tiktoken" | "huggingface" | "api";
  encoding?: string;
  model?: string;
  url?: string;
}

export interface TokenizerResult {
  tokenCount: number;
  tokenizerUsed: string;
  cached: boolean;
}

export interface TokenizerOptions {
  timeout?: number;
}

export interface ProviderTokenizerConfig {
  type?: "tiktoken" | "huggingface" | "api";
  encoding?: string;
  model?: string;
  url?: string;
  default?: TokenizerConfig;
  models?: Record<string, TokenizerConfig>;
}
