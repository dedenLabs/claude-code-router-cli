import { existsSync } from "fs";
import { writeFile } from "fs/promises";
import { homedir, networkInterfaces } from "os";
import path, { join } from "path";
import { initConfig, initDir, cleanupLogFiles } from "./utils";
import { createServer } from "./server";
import { router } from "./utils/router";
import { apiKeyAuth } from "./middleware/auth";
import {
  cleanupPidFile,
  isServiceRunning,
  savePid,
} from "./utils/processCheck";
import { CONFIG_FILE } from "./constants";
import { createStream } from "rotating-file-stream";
import { HOME_DIR } from "./constants";
import { sessionUsageCache } from "./utils/cache";
import { SSEParserTransform } from "./utils/SSEParser.transform";
import { SSESerializerTransform } from "./utils/SSESerializer.transform";
import { rewriteStream } from "./utils/rewriteStream";
import { sendUnifiedRequest, getHttpsProxy } from "./utils/request";
import JSON5 from "json5";
import { IAgent } from "./agents/type";
import agentsManager from "./agents";
import { EventEmitter } from "node:events";

// 读取包配置信息
let packageInfo: { name: string; version: string } | null = null;
try {
  const packagePath = join(__dirname, "..", "package.json");
  if (existsSync(packagePath)) {
    const packageData = JSON.parse(
      require("fs").readFileSync(packagePath, "utf-8"),
    );
    packageInfo = {
      name: packageData.name,
      version: packageData.version,
    };
  }
} catch (error) {
  console.error("Failed to load package.json version");
  packageInfo = { name: "Claude Code Router CLI", version: "unknown" };
}

// 格式化包名
function formatPackageName(packageName: string): string {
  // 移除 @scope/ 前缀
  const cleanName = packageName.replace(/^@[^/]+\//, "");

  // 将连字符替换为空格并首字母大写
  return cleanName
    .split("-")
    .map((word) => {
      // CLI 保持全大写
      if (word.toLowerCase() === "cli") {
        return "CLI";
      }
      // 其他单词首字母大写
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

const event = new EventEmitter();

// 获取所有可访问的IP地址
function getAccessibleIPs(HOST: string): string[] {
  if (HOST !== "0.0.0.0") return [HOST === "127.0.0.1" ? "127.0.0.1" : HOST];

  const testIPRegex = /^(198\.18\.|192\.0\.2\.|203\.0\.113\.)/;
  const addresses: string[] = [];

  for (const netInterface of Object.values(networkInterfaces())) {
    if (netInterface) {
      for (const net of netInterface) {
        if (
          net.family === "IPv4" &&
          !net.internal &&
          !testIPRegex.test(net.address)
        ) {
          addresses.push(net.address);
        }
      }
    }
  }

  return addresses;
}

// 获取主要IP地址（优先显示私有网络地址）
function getPrimaryIP(HOST: string): string {
  const addresses = getAccessibleIPs(HOST);
  const privateIPRegex = /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/;
  // 优先返回192.168.x.x，然后是其他私有地址
  const priorityIP =
    addresses.find((ip) => /^192\.168\./.test(ip)) ||
    addresses.find((ip) => privateIPRegex.test(ip));
  return priorityIP || addresses[0] || HOST;
}

async function initializeClaudeConfig() {
  const homeDir = homedir();
  const configPath = join(homeDir, ".claude.json");
  if (!existsSync(configPath)) {
    const userID = Array.from(
      { length: 64 },
      () => Math.random().toString(16)[2],
    ).join("");
    const configContent = {
      numStartups: 184,
      autoUpdaterStatus: "enabled",
      userID,
      hasCompletedOnboarding: true,
      lastOnboardingVersion: "1.0.17",
      projects: {},
    };
    await writeFile(configPath, JSON.stringify(configContent, null, 2));
  }
}

interface RunOptions {
  port?: number;
  foreground?: boolean;
}

async function run(options: RunOptions = {}) {
  // Check if service is already running
  const isRunning = await isServiceRunning();
  if (isRunning) {
    console.log("✅ Service is already running.");
    return;
  }

  const isInternalBackground = process.argv.includes("--internal-bg");

  await initializeClaudeConfig();
  await initDir();
  // Clean up old log files, keeping only the 10 most recent ones
  await cleanupLogFiles();
  const config = await initConfig();

  let HOST = config.HOST || "127.0.0.1";

  // Handle HOST configuration based on API key
  if (config.HOST && !config.APIKEY) {
    HOST = "127.0.0.1";
    console.warn("⚠️ API key is not set. HOST is forced to 127.0.0.1.");
  }

  const port = config.PORT || 3456;

  // Save the PID of the background process
  savePid(process.pid);

  // Handle SIGINT (Ctrl+C) to clean up PID file
  process.on("SIGINT", () => {
    console.log("Received SIGINT, cleaning up...");
    cleanupPidFile();
    process.exit(0);
  });

  // Handle SIGTERM to clean up PID file
  process.on("SIGTERM", () => {
    cleanupPidFile();
    process.exit(0);
  });

  // Use port from environment variable if set (for background process)
  const servicePort = process.env.SERVICE_PORT
    ? parseInt(process.env.SERVICE_PORT)
    : port;

  // Configure logger based on config settings
  const pad = (num) => (num > 9 ? "" : "0") + num;
  const generator = (time, index) => {
    if (!time) {
      time = new Date();
    }

    var month = time.getFullYear() + "" + pad(time.getMonth() + 1);
    var day = pad(time.getDate());
    var hour = pad(time.getHours());
    var minute = pad(time.getMinutes());

    return `./logs/ccr-${month}${day}${hour}${minute}${pad(time.getSeconds())}${index ? `_${index}` : ""}.log`;
  };
  const loggerConfig =
    config.LOG !== false
      ? {
          level: config.LOG_LEVEL || "debug",
          stream: createStream(generator, {
            path: HOME_DIR,
            maxFiles: 3,
            interval: "1d",
            compress: false,
            maxSize: "50M",
          }),
        }
      : false;

  const server = createServer({
    jsonPath: CONFIG_FILE,
    initialConfig: {
      // ...config,
      providers: config.Providers || config.providers,
      HOST: HOST,
      PORT: servicePort,
      LOG_FILE: join(
        homedir(),
        ".claude-code-router",
        "claude-code-router.log",
      ),
    },
    logger: loggerConfig,
  });

  // Add global error handlers to prevent the service from crashing
  process.on("uncaughtException", (err) => {
    server.logger.error("Uncaught exception:", err);
  });

  process.on("unhandledRejection", (reason, promise) => {
    server.logger.error("Unhandled rejection at:", promise, "reason:", reason);
  });
  // Add async preHandler hook for authentication
  server.addHook("preHandler", async (req, reply) => {
    return new Promise((resolve, reject) => {
      const done = (err?: Error) => {
        if (err) reject(err);
        else resolve();
      };
      // Call the async auth function
      apiKeyAuth(config)(req, reply, done).catch(reject);
    });
  });
  server.addHook("preHandler", async (req, reply) => {
    if (
      req.url.startsWith("/v1/messages") &&
      !req.url.startsWith("/v1/messages/count_tokens")
    ) {
      const useAgents = [];

      for (const agent of agentsManager.getAllAgents()) {
        if (agent.shouldHandle(req, config)) {
          // 设置agent标识
          useAgents.push(agent.name);

          // change request body
          agent.reqHandler(req, config);

          // append agent tools
          if (agent.tools.size) {
            if (!req.body?.tools?.length) {
              req.body.tools = [];
            }
            req.body.tools.unshift(
              ...Array.from(agent.tools.values()).map((item) => {
                return {
                  name: item.name,
                  description: item.description,
                  input_schema: item.input_schema,
                };
              }),
            );
          }
        }
      }

      if (useAgents.length) {
        req.agents = useAgents;
      }
      await router(req, reply, {
        config,
        event,
      });
    }
  });
  server.addHook("onError", async (request, reply, error) => {
    event.emit("onError", request, reply, error);
  });
  server.addHook("onSend", (req, reply, payload, done) => {
    if (
      req.sessionId &&
      req.url.startsWith("/v1/messages") &&
      !req.url.startsWith("/v1/messages/count_tokens")
    ) {
      if (payload instanceof ReadableStream) {
        if (req.agents) {
          const abortController = new AbortController();
          const eventStream = payload.pipeThrough(new SSEParserTransform());
          let currentAgent: undefined | IAgent;
          let currentToolIndex = -1;
          let currentToolName = "";
          let currentToolArgs = "";
          let currentToolId = "";
          const toolMessages: any[] = [];
          const assistantMessages: any[] = [];
          // 存储Anthropic格式的消息体，区分文本和工具类型
          return done(
            null,
            rewriteStream(eventStream, async (data, controller) => {
              try {
                // 检测工具调用开始
                if (
                  data.event === "content_block_start" &&
                  data?.data?.content_block?.name
                ) {
                  const agent = req.agents.find((name: string) =>
                    agentsManager
                      .getAgent(name)
                      ?.tools.get(data.data.content_block.name),
                  );
                  if (agent) {
                    currentAgent = agentsManager.getAgent(agent);
                    currentToolIndex = data.data.index;
                    currentToolName = data.data.content_block.name;
                    currentToolId = data.data.content_block.id;
                    return undefined;
                  }
                }

                // 收集工具参数
                if (
                  currentToolIndex > -1 &&
                  data.data.index === currentToolIndex &&
                  data.data?.delta?.type === "input_json_delta"
                ) {
                  currentToolArgs += data.data?.delta?.partial_json;
                  return undefined;
                }

                // 工具调用完成，处理agent调用
                if (
                  currentToolIndex > -1 &&
                  data.data.index === currentToolIndex &&
                  data.data.type === "content_block_stop"
                ) {
                  try {
                    const args = JSON5.parse(currentToolArgs);
                    assistantMessages.push({
                      type: "tool_use",
                      id: currentToolId,
                      name: currentToolName,
                      input: args,
                    });
                    const toolResult = await currentAgent?.tools
                      .get(currentToolName)
                      ?.handler(args, {
                        req,
                        config,
                      });
                    toolMessages.push({
                      tool_use_id: currentToolId,
                      type: "tool_result",
                      content: toolResult,
                    });
                    currentAgent = undefined;
                    currentToolIndex = -1;
                    currentToolName = "";
                    currentToolArgs = "";
                    currentToolId = "";
                  } catch (e) {
                    console.log(e);
                  }
                  return undefined;
                }

                if (data.event === "message_delta" && toolMessages.length) {
                  req.body.messages.push({
                    role: "assistant",
                    content: assistantMessages,
                  });
                  req.body.messages.push({
                    role: "user",
                    content: toolMessages,
                  });

                  const response = await sendUnifiedRequest(
                    `http://127.0.0.1:${config.PORT || 3456}/v1/messages`,
                    req.body,
                    {
                      headers: {
                        "x-api-key": config.APIKEY,
                        "content-type": "application/json",
                      },
                      httpsProxy: getHttpsProxy(),
                    },
                    { req: { id: "tool-use" } },
                  );
                  if (!response.ok) {
                    return undefined;
                  }
                  const stream = response.body!.pipeThrough(
                    new SSEParserTransform(),
                  );
                  const reader = stream.getReader();
                  while (true) {
                    try {
                      const { value, done } = await reader.read();
                      if (done) {
                        break;
                      }
                      if (
                        ["message_start", "message_stop"].includes(value.event)
                      ) {
                        continue;
                      }

                      // 检查流是否仍然可写
                      if (!controller.desiredSize) {
                        break;
                      }

                      controller.enqueue(value);
                    } catch (readError: any) {
                      if (
                        readError.name === "AbortError" ||
                        readError.code === "ERR_STREAM_PREMATURE_CLOSE"
                      ) {
                        abortController.abort(); // 中止所有相关操作
                        break;
                      }
                      throw readError;
                    }
                  }
                  return undefined;
                }
                return data;
              } catch (error: any) {
                console.error("Unexpected error in stream processing:", error);

                // 处理流提前关闭的错误
                if (error.code === "ERR_STREAM_PREMATURE_CLOSE") {
                  abortController.abort();
                  return undefined;
                }

                // 其他错误仍然抛出
                throw error;
              }
            }).pipeThrough(new SSESerializerTransform()),
          );
        }

        const [originalStream, clonedStream] = payload.tee();
        const read = async (stream: ReadableStream) => {
          const reader = stream.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              // Process the value if needed
              const dataStr = new TextDecoder().decode(value);
              if (!dataStr.startsWith("event: message_delta")) {
                continue;
              }
              const str = dataStr.slice(27);
              try {
                const message = JSON.parse(str);
                sessionUsageCache.put(req.sessionId, message.usage);
              } catch {}
            }
          } catch (readError: any) {
            if (
              readError.name === "AbortError" ||
              readError.code === "ERR_STREAM_PREMATURE_CLOSE"
            ) {
              console.error("Background read stream closed prematurely");
            } else {
              console.error("Error in background stream reading:", readError);
            }
          } finally {
            reader.releaseLock();
          }
        };
        read(clonedStream);
        return done(null, originalStream);
      }
      sessionUsageCache.put(req.sessionId, payload.usage);
      if (typeof payload === "object") {
        if (payload.error) {
          return done(payload.error, null);
        } else {
          return done(payload, null);
        }
      }
    }
    if (typeof payload === "object" && payload.error) {
      return done(payload.error, null);
    }
    done(null, payload);
  });
  server.addHook("onSend", async (req, reply, payload) => {
    event.emit("onSend", req, reply, payload);
    return payload;
  });

  const isForegroundMode =
    options.foreground || !process.argv.includes("--internal-bg");

  server.start();

  if (isForegroundMode) {
    const accessibleIPs = getAccessibleIPs(HOST);
    const primaryIP = getPrimaryIP(HOST);
    const url =
      HOST === "0.0.0.0"
        ? `http://${primaryIP}:${servicePort}`
        : `http://127.0.0.1:${servicePort}`;

    const formattedName = packageInfo
      ? formatPackageName(packageInfo.name)
      : "Claude Code Router CLI";
    const version = packageInfo?.version || "unknown";

    console.log(`\n🚀 ${formattedName} v${version} is running on ${url}`);

    if (HOST === "0.0.0.0" && accessibleIPs.length > 0) {
      console.log(`   (Bound to all interfaces, accessible externally)`);
      if (accessibleIPs.length > 1) {
        console.log(`   Available addresses: ${accessibleIPs.join(", ")}`);
      } else {
        console.log(`   Available address: ${accessibleIPs[0]}`);
      }
    }

    console.log("   Press Ctrl+C to stop the server\n");
  } else {
    // Background mode: don't show console output but keep running
    // The detached: true in spawn handles detaching from parent
    // Just exit the function without blocking
  }
}

export { run };
