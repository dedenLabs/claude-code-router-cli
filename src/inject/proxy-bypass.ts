// Proxy bypass injection for esbuild
// This file is injected at build time via --inject flag
// It ensures local addresses (localhost/127.0.0.1) bypass proxy

// Check if URL is a local address that should bypass proxy
function __shouldBypassProxy(url) {
  try {
    const urlStr = typeof url === "string" ? url : url.toString();
    const urlObj = new URL(urlStr);
    const hostname = urlObj.hostname.toLowerCase();
    // Check if hostname is a local address
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      (hostname.startsWith("172.") &&
        parseInt(hostname.split(".")[1]) >= 16 &&
        parseInt(hostname.split(".")[1] <= 31))
    );
  } catch {
    return false;
  }
}

// Set NO_PROXY environment variable if not already set
if (!process.env.NO_PROXY) {
  process.env.NO_PROXY =
    "localhost,127.0.0.1,0.0.0.0,::1,192.168.*,10.*,172.16-31.*";
} else {
  const noProxy = process.env.NO_PROXY;
  const additions = [];
  if (!noProxy.includes("localhost")) additions.push("localhost");
  if (!noProxy.includes("127.0.0.1")) additions.push("127.0.0.1");
  if (!noProxy.includes("0.0.0.0")) additions.push("0.0.0.0");
  if (!noProxy.includes("::1")) additions.push("::1");
  if (additions.length > 0) {
    process.env.NO_PROXY = noProxy + "," + additions.join(",");
  }
}

// Store ProxyAgent reference for patching
const __OriginalProxyAgent = globalThis.ProxyAgent;

// Patch ProxyAgent to bypass local addresses
if (__OriginalProxyAgent) {
  globalThis.ProxyAgent = class extends __OriginalProxyAgent {
    constructor(input, options) {
      let targetUrl = input;
      if (input && typeof input === "object" && "href" in input) {
        targetUrl = input.href;
      }
      if (__shouldBypassProxy(targetUrl)) {
        // For local addresses, use a no-op factory to bypass proxy
        super(input, { ...options, factory: () => ({}) });
      } else {
        super(input, options);
      }
    }
  };
}
