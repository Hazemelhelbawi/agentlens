const BLOCKED = /^(chrome|edge|about|chrome-extension|moz-extension|devtools|view-source|file):/i;
const STORES = [
  "https://chrome.google.com/webstore",
  "https://chromewebstore.google.com",
  "https://microsoftedge.microsoft.com/addons",
];

export function isRestrictedUrl(url?: string | null): boolean {
  if (!url) return true;
  if (BLOCKED.test(url)) return true;
  return STORES.some((prefix) => url.startsWith(prefix));
}

export function restrictedError(url?: string | null): { title: string; reason: string; hint: string } {
  if (url?.startsWith("file:")) {
    return {
      title: "AgentLens can't inspect this page.",
      reason: "Local file:// pages are not available to the extension with its current permissions.",
      hint: "Serve the page over http(s), then click AgentLens again.",
    };
  }
  if (url?.startsWith("chrome:") || url?.startsWith("edge:") || url?.startsWith("about:")) {
    return {
      title: "AgentLens can't inspect this page.",
      reason: "chrome:// and other browser-internal pages cannot be analyzed.",
      hint: "Open a public http(s) website, then click AgentLens again.",
    };
  }
  if (/^(chrome-extension|moz-extension|extension):/i.test(url ?? "")) {
    return {
      title: "AgentLens can't inspect this page.",
      reason: "extension:// pages cannot be analyzed.",
      hint: "Open a public http(s) website, then click AgentLens again.",
    };
  }
  return {
    title: "AgentLens can't inspect this page.",
    reason: url
      ? "Chrome does not allow extensions to inspect browser-internal or store pages."
      : "This tab has no inspectable address.",
    hint: "Open a public http(s) website, then click AgentLens again.",
  };
}
