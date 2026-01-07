import { ProxyAgent } from "undici";
import { UnifiedChatRequest } from "../types/llm";

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

export function sendUnifiedRequest(
  url: URL | string,
  request: UnifiedChatRequest,
  config: any,
  context: any,
  logger?: any
): Promise<Response> {
  const headers = new Headers({
    "Content-Type": "application/json",
  });
  if (config.headers) {
    Object.entries(config.headers).forEach(([key, value]) => {
      if (value) {
        headers.set(key, value as string);
      }
    });
  }
  let combinedSignal: AbortSignal;
  const timeoutSignal = AbortSignal.timeout(config.TIMEOUT ?? 60 * 1000 * 60);

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

  // 使用代理时排除本地地址
  const httpsProxy = config.httpsProxy;
  if (httpsProxy && !isLocalHost(url)) {
    (fetchOptions as any).dispatcher = new ProxyAgent(
      new URL(httpsProxy).toString()
    );
  }

  logger?.debug(
    {
      reqId: context.req.id,
      request: fetchOptions,
      headers: Object.fromEntries(headers.entries()),
      requestUrl: typeof url === "string" ? url : url.toString(),
      useProxy: !!httpsProxy && !isLocalHost(url),
      isLocalHost: isLocalHost(url),
    },
    "final request"
  );
  return fetch(typeof url === "string" ? url : url.toString(), fetchOptions);
}
