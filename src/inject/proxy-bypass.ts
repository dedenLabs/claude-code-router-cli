// Proxy bypass injection for esbuild
// This file is injected at build time via --inject flag
// It ensures local addresses (localhost/127.0.0.1) bypass proxy

// Set NO_PROXY environment variable FIRST, before any other code runs
// This is critical for Windows proxy environments where localhost requests fail
const __localAddresses = ["localhost", "127.0.0.1", "0.0.0.0", "::1"];

// Add private network ranges
for (let i = 16; i <= 31; i++) {
  __localAddresses.push(`172.${i}.0.0/16`);
}
__localAddresses.push("192.168.0.0/16");
__localAddresses.push("10.0.0.0/8");

// Set NO_PROXY if not already set, or append to existing
if (!process.env.NO_PROXY) {
  process.env.NO_PROXY = __localAddresses.join(",");
} else {
  const noProxy = process.env.NO_PROXY;
  const additions = __localAddresses.filter(
    (addr) => !noProxy.includes(addr) && !noProxy.includes(addr.split("/")[0]),
  );
  if (additions.length > 0) {
    process.env.NO_PROXY = noProxy + "," + additions.join(",");
  }
}

// Store ProxyAgent reference for patching - must be done before any imports
const __OriginalProxyAgent = globalThis.ProxyAgent;

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

// Patch ProxyAgent to bypass local addresses
// This is executed BEFORE @musistudio/llms or any other module runs
if (__OriginalProxyAgent) {
  globalThis.ProxyAgent = class extends __OriginalProxyAgent {
    constructor(input, options) {
      let targetUrl = input;
      if (input && typeof input === "object" && "href" in input) {
        targetUrl = input.href;
      }

      // For local addresses, bypass proxy entirely
      if (__shouldBypassProxy(targetUrl)) {
        // Create a direct connection dispatcher (no proxy)
        super(input, {
          ...options,
          factory: (origin, dispatcher) => dispatcher,
        });
      } else {
        super(input, options);
      }
    }
  };
}

// Also patch the fetch function to remove proxy headers for local requests
const __OriginalFetch = globalThis.fetch;
if (__OriginalFetch) {
  globalThis.fetch = function (...args) {
    let url = args[0];
    if (url && __shouldBypassProxy(url)) {
      // Remove any proxy-related headers for local requests
      const options = args[1];
      if (options && options.headers) {
        const headers = new Headers(options.headers);
        headers.delete("Proxy-Authorization");
        headers.delete("Proxy-Authenticate");
        args[1] = { ...options, headers };
      }
    }
    return __OriginalFetch.apply(this, args);
  };
}
