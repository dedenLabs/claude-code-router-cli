import { Transformer } from "../../types/transformer";

export class AnthropicTransformer implements Transformer {
  static TransformerName = "anthropic";
  name = "anthropic";
  endPoint = "/v1/messages";
}

export class OpenAITransformer implements Transformer {
  static TransformerName = "openai";
  name = "openai";
  endPoint = "/v1/chat/completions";
}

export class GeminiTransformer implements Transformer {
  static TransformerName = "gemini";
  name = "gemini";
  endPoint = "/v1/google/generateContent";
}

export class DeepseekTransformer implements Transformer {
  static TransformerName = "deepseek";
  name = "deepseek";
  endPoint = "/v1/chat/completions";
}

export class GroqTransformer implements Transformer {
  static TransformerName = "groq";
  name = "groq";
  endPoint = "/v1/chat/completions";
}

export class OpenrouterTransformer implements Transformer {
  static TransformerName = "openrouter";
  name = "openrouter";
  endPoint = "/v1/chat/completions";
}

export class MaxTokenTransformer implements Transformer {
  static TransformerName = "maxToken";
  name = "maxToken";
}

export class ReasoningTransformer implements Transformer {
  static TransformerName = "reasoning";
  name = "reasoning";
}

export class SamplingTransformer implements Transformer {
  static TransformerName = "sampling";
  name = "sampling";
}

export class CleancacheTransformer implements Transformer {
  static TransformerName = "cleanCache";
  name = "cleanCache";
}

export class EnhanceToolTransformer implements Transformer {
  static TransformerName = "enhanceTool";
  name = "enhanceTool";
}

export default {
  AnthropicTransformer,
  OpenAITransformer,
  GeminiTransformer,
  DeepseekTransformer,
  GroqTransformer,
  OpenrouterTransformer,
  MaxTokenTransformer,
  ReasoningTransformer,
  SamplingTransformer,
  CleancacheTransformer,
  EnhanceToolTransformer,
};
