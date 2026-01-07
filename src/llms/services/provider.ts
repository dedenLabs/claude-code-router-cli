import { TransformerConstructor } from "../../types/transformer";
import {
  LLMProvider,
  RegisterProviderRequest,
  ModelRoute,
  RequestRouteInfo,
  ConfigProvider,
} from "../types/llm";
import { ConfigService } from "./config";
import { TransformerService } from "./transformer";

export class ProviderService {
  private providers: Map<string, LLMProvider> = new Map();
  private modelRoutes: Map<string, ModelRoute> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly transformerService: TransformerService,
    private readonly logger: any
  ) {
    this.initializeCustomProviders();
  }

  private initializeCustomProviders() {
    const providersConfig = this.configService.get<ConfigProvider[]>("providers");
    if (providersConfig && Array.isArray(providersConfig)) {
      this.initializeFromProvidersArray(providersConfig);
    }
  }

  private initializeFromProvidersArray(providersConfig: ConfigProvider[]) {
    providersConfig.forEach((providerConfig: ConfigProvider) => {
      try {
        if (!providerConfig.name || !providerConfig.api_base_url || !providerConfig.api_key) {
          return;
        }

        const transformer: LLMProvider["transformer"] = {};

        if (providerConfig.transformer) {
          Object.keys(providerConfig.transformer).forEach((key) => {
            if (key === "use") {
              if (Array.isArray(providerConfig.transformer.use)) {
                transformer.use = providerConfig.transformer.use.map((t) => {
                  if (Array.isArray(t) && typeof t[0] === "string") {
                    const Constructor = this.transformerService.getTransformer(t[0]);
                    if (Constructor) {
                      return new (Constructor as TransformerConstructor)(t[1]);
                    }
                  }
                  if (typeof t === "string") {
                    const instance = this.transformerService.getTransformer(t);
                    if (typeof instance === "function") {
                      return new instance();
                    }
                    return instance;
                  }
                }).filter((t) => typeof t !== "undefined");
              }
            } else {
              if (Array.isArray(providerConfig.transformer[key]?.use)) {
                transformer[key] = {
                  use: providerConfig.transformer[key].use.map((t) => {
                    if (Array.isArray(t) && typeof t[0] === "string") {
                      const Constructor = this.transformerService.getTransformer(t[0]);
                      if (Constructor) {
                        return new (Constructor as TransformerConstructor)(t[1]);
                      }
                    }
                    if (typeof t === "string") {
                      const instance = this.transformerService.getTransformer(t);
                      if (typeof instance === "function") {
                        return new instance();
                      }
                      return instance;
                    }
                  }).filter((t) => typeof t !== "undefined"),
                };
              }
            }
          });
        }

        this.registerProvider({
          name: providerConfig.name,
          baseUrl: providerConfig.api_base_url,
          apiKey: providerConfig.api_key,
          models: providerConfig.models || [],
          transformer: providerConfig.transformer ? transformer : undefined,
        });

        this.logger.info(`${providerConfig.name} provider registered`);
      } catch (error) {
        this.logger.error(`${providerConfig.name} provider registered error: ${error}`);
      }
    });
  }

  registerProvider(request: RegisterProviderRequest): LLMProvider {
    const provider: LLMProvider = { ...request };
    this.providers.set(provider.name, provider);

    request.models.forEach((model) => {
      const fullModel = `${provider.name},${model}`;
      const route: ModelRoute = { provider: provider.name, model, fullModel };
      this.modelRoutes.set(fullModel, route);
      if (!this.modelRoutes.has(model)) {
        this.modelRoutes.set(model, route);
      }
    });

    return provider;
  }

  getProviders(): LLMProvider[] {
    return Array.from(this.providers.values());
  }

  getProvider(name: string): LLMProvider | undefined {
    return this.providers.get(name);
  }

  updateProvider(id: string, updates: Partial<LLMProvider>): LLMProvider | null {
    const provider = this.providers.get(id);
    if (!provider) return null;

    const updatedProvider = { ...provider, ...updates, updatedAt: new Date() };
    this.providers.set(id, updatedProvider);

    if (updates.models) {
      provider.models.forEach((model) => {
        this.modelRoutes.delete(`${provider.name},${model}`);
        this.modelRoutes.delete(model);
      });
      updates.models.forEach((model) => {
        const fullModel = `${provider.name},${model}`;
        this.modelRoutes.set(fullModel, { provider: provider.name, model, fullModel });
        if (!this.modelRoutes.has(model)) {
          this.modelRoutes.set(model, { provider: provider.name, model, fullModel });
        }
      });
    }

    return updatedProvider;
  }

  deleteProvider(id: string): boolean {
    const provider = this.providers.get(id);
    if (!provider) return false;

    provider.models.forEach((model) => {
      this.modelRoutes.delete(`${provider.name},${model}`);
      this.modelRoutes.delete(model);
    });

    this.providers.delete(id);
    return true;
  }

  toggleProvider(name: string, enabled: boolean): boolean {
    const provider = this.providers.get(name);
    if (!provider) return false;
    return true;
  }

  resolveModelRoute(modelName: string): RequestRouteInfo | null {
    const route = this.modelRoutes.get(modelName);
    if (!route) return null;

    const provider = this.providers.get(route.provider);
    if (!provider) return null;

    return { provider, originalModel: modelName, targetModel: route.model };
  }

  getAvailableModelNames(): string[] {
    const modelNames: string[] = [];
    this.providers.forEach((provider) => {
      provider.models.forEach((model) => {
        modelNames.push(model);
        modelNames.push(`${provider.name},${model}`);
      });
    });
    return modelNames;
  }
}
