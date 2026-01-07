import { LRUCache } from "lru-cache";
import { readFile } from "fs/promises";
import { opendir, stat } from "fs/promises";
import { join } from "path";
import { CLAUDE_PROJECTS_DIR, HOME_DIR } from "../../constants";
import { get_encoding } from "tiktoken";
import { ConfigService } from "../services/config";
import { TokenizerService } from "../services/tokenizer";

const enc = get_encoding("cl100k_base");

export interface Usage {
  input_tokens: number;
  output_tokens: number;
}

class LRUCacheImpl<K, V> {
  private capacity: number;
  private cache: Map<K, V>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map<K, V>();
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key) as V;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  put(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  values(): V[] {
    return Array.from(this.cache.values());
  }
}

export const sessionUsageCache = new LRUCacheImpl<string, Usage>(100);

interface Tool {
  name: string;
  description?: string;
  input_schema: object;
}

interface MessageParam {
  role: string;
  content: string | any[];
}

export const calculateTokenCount = (
  messages: MessageParam[],
  system: any,
  tools: Tool[],
) => {
  let tokenCount = 0;
  if (Array.isArray(messages)) {
    messages.forEach((message) => {
      if (typeof message.content === "string") {
        tokenCount += enc.encode(message.content).length;
      } else if (Array.isArray(message.content)) {
        message.content.forEach((contentPart: any) => {
          if (contentPart.type === "text") {
            tokenCount += enc.encode(contentPart.text || "").length;
          } else if (contentPart.type === "tool_use") {
            tokenCount += enc.encode(
              JSON.stringify(contentPart.input || {}),
            ).length;
          } else if (contentPart.type === "tool_result") {
            const content =
              typeof contentPart.content === "string"
                ? contentPart.content
                : JSON.stringify(contentPart.content || {});
            tokenCount += enc.encode(content).length;
          }
        });
      }
    });
  }
  if (typeof system === "string") {
    tokenCount += enc.encode(system).length;
  } else if (Array.isArray(system)) {
    system.forEach((item: any) => {
      if (item.type !== "text") return;
      if (typeof item.text === "string") {
        tokenCount += enc.encode(item.text).length;
      }
    });
  }
  if (tools) {
    tools.forEach((tool: Tool) => {
      if (tool.description) {
        tokenCount += enc.encode(
          (tool.name || "") + (tool.description || ""),
        ).length;
      }
      if (tool.input_schema) {
        tokenCount += enc.encode(
          JSON.stringify(tool.input_schema || {}),
        ).length;
      }
    });
  }
  return tokenCount;
};

const sessionProjectCache = new LRUCacheImpl<string, string>(1000);

export const searchProjectBySession = async (
  sessionId: string,
): Promise<string | null> => {
  if (sessionProjectCache.has(sessionId)) {
    const result = sessionProjectCache.get(sessionId);
    if (!result || result === "") return null;
    return result;
  }

  try {
    const dir = await opendir(CLAUDE_PROJECTS_DIR);
    const folderNames: string[] = [];
    for await (const dirent of dir) {
      if (dirent.isDirectory()) folderNames.push(dirent.name);
    }

    const checkPromises = folderNames.map(async (folderName) => {
      const sessionFilePath = join(
        CLAUDE_PROJECTS_DIR,
        folderName,
        `${sessionId}.jsonl`,
      );
      try {
        const fileStat = await stat(sessionFilePath);
        return fileStat.isFile() ? folderName : null;
      } catch {
        return null;
      }
    });

    const results = await Promise.all(checkPromises);
    for (const result of results) {
      if (result) {
        sessionProjectCache.set(sessionId, result);
        return result;
      }
    }
    sessionProjectCache.set(sessionId, "");
    return null;
  } catch (error) {
    sessionProjectCache.set(sessionId, "");
    return null;
  }
};

const getProjectSpecificRouter = async (
  req: any,
  configService: ConfigService,
) => {
  if (req.sessionId) {
    const project = await searchProjectBySession(req.sessionId);
    if (project) {
      const sessionConfigPath = join(
        HOME_DIR,
        project,
        `${req.sessionId}.json`,
      );
      try {
        const sessionConfig = JSON.parse(
          await readFile(sessionConfigPath, "utf8"),
        );
        if (sessionConfig && sessionConfig.Router) return sessionConfig.Router;
      } catch {}
      const projectConfigPath = join(HOME_DIR, project, "config.json");
      try {
        const projectConfig = JSON.parse(
          await readFile(projectConfigPath, "utf8"),
        );
        if (projectConfig && projectConfig.Router) return projectConfig.Router;
      } catch {}
    }
  }
  return undefined;
};

const getUseModel = async (
  req: any,
  tokenCount: number,
  configService: ConfigService,
  lastUsage?: Usage | undefined,
): Promise<{ model: string; scenarioType: RouterScenarioType }> => {
  const projectSpecificRouter = await getProjectSpecificRouter(
    req,
    configService,
  );
  const providers = configService.get<any[]>("providers") || [];
  const Router = projectSpecificRouter || configService.get("Router");

  if (req.body.model.includes(",")) {
    const [provider, model] = req.body.model.split(",");
    const finalProvider = providers.find(
      (p: any) => p.name.toLowerCase() === provider,
    );
    const finalModel = finalProvider?.models?.find(
      (m: any) => m.toLowerCase() === model,
    );
    if (finalProvider && finalModel) {
      return {
        model: `${finalProvider.name},${finalModel}`,
        scenarioType: "default",
      };
    }
    return { model: req.body.model, scenarioType: "default" };
  }

  const longContextThreshold = Router?.longContextThreshold || 60000;
  const lastUsageThreshold =
    lastUsage &&
    lastUsage.input_tokens > longContextThreshold &&
    tokenCount > 20000;
  const tokenCountThreshold = tokenCount > longContextThreshold;
  if ((lastUsageThreshold || tokenCountThreshold) && Router?.longContext) {
    req.log.info(
      `Using long context model due to token count: ${tokenCount}, threshold: ${longContextThreshold}`,
    );
    return { model: Router.longContext, scenarioType: "longContext" };
  }

  if (
    req.body?.system?.length > 1 &&
    req.body?.system[1]?.text?.startsWith("<CCR-SUBAGENT-MODEL>")
  ) {
    const model = req.body?.system[1].text.match(
      /<CCR-SUBAGENT-MODEL>(.*?)<\/CCR-SUBAGENT-MODEL>/s,
    );
    if (model) {
      req.body.system[1].text = req.body.system[1].text.replace(
        `<CCR-SUBAGENT-MODEL>${model[1]}</CCR-SUBAGENT-MODEL>`,
        "",
      );
      return { model: model[1], scenarioType: "default" };
    }
  }

  const globalRouter = configService.get("Router");
  if (
    req.body.model?.includes("claude") &&
    req.body.model?.includes("haiku") &&
    globalRouter?.background
  ) {
    req.log.info(`Using background model for ${req.body.model}`);
    return { model: globalRouter.background, scenarioType: "background" };
  }

  if (
    Array.isArray(req.body.tools) &&
    req.body.tools.some((tool: any) => tool.type?.startsWith("web_search")) &&
    Router?.webSearch
  ) {
    return { model: Router.webSearch, scenarioType: "webSearch" };
  }

  if (req.body.thinking && Router?.think) {
    req.log.info(`Using think model for ${req.body.thinking}`);
    return { model: Router.think, scenarioType: "think" };
  }

  return { model: Router?.default, scenarioType: "default" };
};

export type RouterScenarioType =
  | "default"
  | "background"
  | "think"
  | "longContext"
  | "webSearch";

export interface RouterContext {
  configService: ConfigService;
  tokenizerService?: TokenizerService;
  event?: any;
}

export const router = async (req: any, _res: any, context: RouterContext) => {
  const { configService, event } = context;

  if (req.body.metadata?.user_id) {
    const parts = req.body.metadata.user_id.split("_session_");
    if (parts.length > 1) {
      req.sessionId = parts[1];
    }
  }

  const lastMessageUsage = sessionUsageCache.get(req.sessionId);
  const { messages, system = [], tools } = req.body;

  try {
    const [providerName, modelName] = req.body.model.split(",");
    const tokenizerConfig =
      context.tokenizerService?.getTokenizerConfigForModel(
        providerName,
        modelName,
      );

    let tokenCount: number;
    if (context.tokenizerService) {
      const result = await context.tokenizerService.countTokens(
        { messages, system, tools },
        tokenizerConfig,
      );
      tokenCount = result.tokenCount;
    } else {
      tokenCount = calculateTokenCount(
        messages as MessageParam[],
        system,
        tools as Tool[],
      );
    }

    let model: string;
    const customRouterPath = configService.get("CUSTOM_ROUTER_PATH");
    if (customRouterPath) {
      try {
        const customRouter = require(customRouterPath);
        req.tokenCount = tokenCount;
        model = await customRouter(req, configService.getAll(), { event });
      } catch (e: any) {
        req.log.error(`failed to load custom router: ${e.message}`);
      }
    }

    if (!model) {
      const result = await getUseModel(
        req,
        tokenCount,
        configService,
        lastMessageUsage,
      );
      model = result.model;
      req.scenarioType = result.scenarioType;
    } else {
      req.scenarioType = "default";
    }

    req.body.model = model;
  } catch (error: any) {
    req.log.error(`Error in router middleware: ${error.message}`);
    const Router = configService.get("Router");
    req.body.model = Router?.default;
    req.scenarioType = "default";
  }
};
