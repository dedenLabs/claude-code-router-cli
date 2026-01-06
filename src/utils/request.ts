import { ProxyAgent } from "undici";

export interface RequestConfig {
  httpsProxy?: string;
  TIMEOUT?: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export interface RequestContext {
  req: {
    id: string;
  };
}

/**
 * 从多个来源获取 HTTPS 代理配置
 */
export function getHttpsProxy(): string | undefined {
  return (
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTPS_PROXY?.toLowerCase() ||
    process.env.https_proxy?.toLowerCase() ||
    process.env.PROXY_URL
  );
}

/**
 * 检查是否是本地地址（localhost/127.0.0.1）
 * 本地地址不应使用代理，否则会导致连接失败
 */
function isLocalHost(url: string | URL): boolean {
  const urlObj = typeof url === "string" ? new URL(url) : url;
  const hostname = urlObj.hostname.toLowerCase();
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "0.0.0.0"
  );
}

/**
 * 统一的请求发送函数
 * 支持代理、超时、请求/响应转换
 */
export async function sendUnifiedRequest(
  url: URL | string,
  request: any,
  config: RequestConfig = {},
  context: RequestContext,
  logger?: any,
): Promise<Response> {
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  if (config.headers) {
    Object.entries(config.headers).forEach(([key, value]) => {
      if (value) {
        headers.set(key, value);
      }
    });
  }

  // 合并超时控制
  let combinedSignal: AbortSignal;
  const timeoutSignal = AbortSignal.timeout(config.TIMEOUT ?? 60 * 1000 * 60); // 默认 60 分钟

  if (config.signal) {
    const controller = new AbortController();
    const abortHandler = () => controller.abort();
    config.signal.addEventListener("abort", abortHandler);
    timeoutSignal.addEventListener("abort", abortHandler);
    combinedSignal = controller.signal;
  } else {
    combinedSignal = timeoutSignal;
  }

  const fetchOptions: RequestInit = {
    method: "POST",
    headers: headers,
    body: JSON.stringify(request),
    signal: combinedSignal,
  };

  // 使用 undici 的 ProxyAgent 处理代理
  // 注意：本地地址（localhost/127.0.0.1）不应使用代理，否则会导致连接失败
  const httpsProxy = config.httpsProxy || getHttpsProxy();
  if (httpsProxy && !isLocalHost(url)) {
    (fetchOptions as any).dispatcher = new ProxyAgent(
      new URL(httpsProxy).toString(),
    );
  }

  // 调试日志
  if (logger?.debug) {
    logger.debug(
      {
        reqId: context?.req?.id,
        request: fetchOptions,
        headers: Object.fromEntries(headers.entries()),
        requestUrl: typeof url === "string" ? url : url.toString(),
        useProxy: !!httpsProxy && !isLocalHost(url),
        isLocalHost: isLocalHost(url),
      },
      "final request",
    );
  }

  const response = await fetch(
    typeof url === "string" ? url : url.toString(),
    fetchOptions,
  );

  return response;
}
