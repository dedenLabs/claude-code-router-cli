import { ConfigService } from "./config";
import { TiktokenTokenizer } from "../tokenizer/tiktoken-tokenizer";

export interface TokenizerConfig {
  type: "tiktoken" | "huggingface" | "api";
  encoding?: string;
  model?: string;
  url?: string;
}

export interface TokenizeRequest {
  messages?: Array<{ role: string; content: string }>;
  content?: string;
}

export interface TokenizerResult {
  tokenCount: number;
  tokenizerUsed: string;
  cached: boolean;
}

export interface TokenizerOptions {
  timeout?: number;
}

export class TokenizerService {
  private tokenizers: Map<string, any> = new Map();
  private fallbackTokenizer?: any;
  private configService: ConfigService;
  private logger: any;
  private options: TokenizerOptions;

  constructor(configService: ConfigService, logger: any, options: TokenizerOptions = {}) {
    this.configService = configService;
    this.logger = logger;
    this.options = { timeout: options.timeout ?? 30000, ...options };
  }

  async initialize(): Promise<void> {
    try {
      this.fallbackTokenizer = new TiktokenTokenizer("cl100k_base");
      await this.fallbackTokenizer.initialize();
      this.tokenizers.set("fallback", this.fallbackTokenizer);
      this.logger?.info("TokenizerService initialized successfully");
    } catch (error: any) {
      this.logger?.error(`TokenizerService initialization error: ${error.message}`);
      throw error;
    }
  }

  async getTokenizer(config: TokenizerConfig): Promise<any> {
    const cacheKey = this.getCacheKey(config);

    if (this.tokenizers.has(cacheKey)) {
      return this.tokenizers.get(cacheKey)!;
    }

    let tokenizer: any;

    try {
      switch (config.type) {
        case "tiktoken":
          tokenizer = new TiktokenTokenizer(config.encoding || "cl100k_base");
          break;
        default:
          return this.fallbackTokenizer!;
      }

      await tokenizer.initialize();
      this.tokenizers.set(cacheKey, tokenizer);
      return tokenizer;
    } catch (error: any) {
      this.logger?.error(`Failed to initialize ${config.type} tokenizer: ${error.message}`);
      if (!this.fallbackTokenizer) {
        await this.initialize();
      }
      return this.fallbackTokenizer!;
    }
  }

  async countTokens(request: TokenizeRequest, config?: TokenizerConfig): Promise<TokenizerResult> {
    const tokenizer = config ? await this.getTokenizer(config) : this.fallbackTokenizer!;
    const tokenCount = await tokenizer.countTokens(request);
    return { tokenCount, tokenizerUsed: tokenizer.name, cached: false };
  }

  dispose(): void {
    this.tokenizers.forEach((tokenizer) => {
      try {
        tokenizer.dispose();
      } catch (error) {
        this.logger?.error(`Error disposing tokenizer: ${error}`);
      }
    });
    this.tokenizers.clear();
  }

  private getCacheKey(config: TokenizerConfig): string {
    switch (config.type) {
      case "tiktoken":
        return `tiktoken:${config.encoding || "cl100k_base"}`;
      case "huggingface":
        return `hf:${config.model}`;
      case "api":
        return `api:${config.url}`;
      default:
        return `unknown:${JSON.stringify(config)}`;
    }
  }
}
