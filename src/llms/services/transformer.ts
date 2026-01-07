import { Transformer, TransformerConstructor } from "../../types/transformer";
import { ConfigService } from "./config";
import Transformers from "../../transformer";

export class TransformerService {
  private transformers: Map<string, Transformer | TransformerConstructor> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: any
  ) {}

  registerTransformer(name: string, transformer: Transformer): void {
    this.transformers.set(name, transformer);
    this.logger.info(
      `register transformer: ${name}${transformer.endPoint ? ` (endpoint: ${transformer.endPoint})` : ""}`
    );
  }

  getTransformer(name: string): Transformer | TransformerConstructor | undefined {
    return this.transformers.get(name);
  }

  getAllTransformers(): Map<string, Transformer | TransformerConstructor> {
    return new Map(this.transformers);
  }

  getTransformersWithEndpoint(): { name: string; transformer: Transformer }[] {
    const result: { name: string; transformer: Transformer }[] = [];
    this.transformers.forEach((transformer, name) => {
      if (typeof transformer === "object" && transformer.endPoint) {
        result.push({ name, transformer });
      }
    });
    return result;
  }

  getTransformersWithoutEndpoint(): { name: string; transformer: Transformer }[] {
    const result: { name: string; transformer: Transformer }[] = [];
    this.transformers.forEach((transformer, name) => {
      if (typeof transformer === "object" && !transformer.endPoint) {
        result.push({ name, transformer });
      }
    });
    return result;
  }

  removeTransformer(name: string): boolean {
    return this.transformers.delete(name);
  }

  hasTransformer(name: string): boolean {
    return this.transformers.has(name);
  }

  async initialize(): Promise<void> {
    try {
      await this.registerDefaultTransformersInternal();
    } catch (error: any) {
      this.logger.error(`TransformerService init error: ${error.message}`);
    }
  }

  private async registerDefaultTransformersInternal(): Promise<void> {
    try {
      Object.values(Transformers).forEach((TransformerStatic: any) => {
        if ("TransformerName" in TransformerStatic && typeof TransformerStatic.TransformerName === "string") {
          this.registerTransformer(TransformerStatic.TransformerName, TransformerStatic);
        } else {
          const transformerInstance = new TransformerStatic();
          if (transformerInstance && typeof transformerInstance === "object") {
            (transformerInstance as any).logger = this.logger;
          }
          this.registerTransformer(transformerInstance.name!, transformerInstance);
        }
      });
    } catch (error) {
      this.logger.error({ error }, "transformer regist error:");
    }
  }
}
