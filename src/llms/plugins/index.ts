export interface PluginMetadata {
  name: string;
  version: string;
  description?: string;
}

export interface CCRPluginOptions {
  metadata: PluginMetadata;
}

export class CCRPlugin {
  constructor(options: CCRPluginOptions) {
    this.metadata = options.metadata;
  }
  metadata: PluginMetadata;
}

export const pluginManager = {
  registerPlugin: (plugin: any) => {},
  getPlugins: () => [],
};

export const tokenSpeedPlugin = new CCRPlugin({ metadata: { name: 'token-speed', version: '1.0.0' } });
export const getTokenSpeedStats = () => ({ tokensPerSecond: 0, totalTokens: 0 });
export const getGlobalTokenSpeedStats = () => ({ tokensPerSecond: 0, totalTokens: 0 });
