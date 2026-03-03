import { LLMProvider } from "@/types/llm";
import {
  Transformer,
  TransformerContext,
  TransformerOptions,
} from "@/types/transformer";

export class PassthroughTransformer implements Transformer {
  name = "Passthrough";

  async transformRequestOut(
    request: Record<string, any>,
    context: TransformerContext
  ): Promise<Record<string, any>> {
    // 直通模式：原样返回请求，不做任何转换
    return {
      body: request,
      config: {},
    };
  }

  async transformResponseIn(
    response: Response,
    context?: TransformerContext
  ): Promise<Response> {
    // 直通模式：原样返回响应，不做任何转换
    return response;
  }

  async auth(
    request: any,
    provider: LLMProvider,
    context: TransformerContext
  ): Promise<any> {
    // 直通模式：不做任何认证修改，原样传递
    return {
      body: request,
      config: {},
    };
  }
}
