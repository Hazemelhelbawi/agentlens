import { analyzeCollectedPage, type CollectedPageInput } from "@agentlens/analyzer";
import type { AnalysisResult } from "@agentlens/shared";
import {
  COLLECT_TYPE,
  INSPECT_TYPE,
  type BackgroundToPopup,
  type ExtensionError,
  type InspectPayload,
  type InspectResult,
  type PopupToBackground,
} from "../lib/messages.js";
import { isRestrictedUrl, restrictedError } from "../lib/restricted.js";

interface CacheEntry {
  url: string;
  result: AnalysisResult;
}

const cache = new Map<number, CacheEntry>();
let lastResult: AnalysisResult | null = null;

function send(port: chrome.runtime.Port, message: BackgroundToPopup): void {
  try {
    port.postMessage(message);
  } catch {
    /* popup closed */
  }
}

async function activeTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw Object.assign(new Error("No active tab"), { code: "no-tab" });
  return tab;
}

async function ensureContent(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"],
  });
}

async function collect(tabId: number): Promise<CollectedPageInput> {
  await ensureContent(tabId);
  const response = (await chrome.tabs.sendMessage(tabId, { type: COLLECT_TYPE })) as {
    ok?: boolean;
    page?: CollectedPageInput;
    error?: string;
  };
  if (!response?.ok || !response.page) {
    throw new Error(response?.error ?? "The content script could not read this page.");
  }
  return response.page;
}

function applyBadge(tabId: number, result: AnalysisResult): void {
  const critical = result.findings.filter((item) => item.severity === "critical").length;
  const text = critical > 0 ? "!" : String(result.score);
  const color = critical > 0 ? "#dc2626" : result.score >= 75 ? "#16a34a" : result.score >= 60 ? "#ca8a04" : "#71717a";
  void chrome.action.setBadgeText({ tabId, text });
  void chrome.action.setBadgeBackgroundColor({ tabId, color });
}

function toError(error: unknown, url?: string): ExtensionError {
  if (isRestrictedUrl(url)) return restrictedError(url);
  const message = error instanceof Error ? error.message : "Analyzer failure";
  if (/cannot be scripted|The extensions gallery|chrome:\/\//i.test(message)) {
    return restrictedError(url);
  }
  if (/timeout|aborted/i.test(message)) {
    return {
      title: "AgentLens couldn't finish this analysis.",
      reason: "The page took too long to read or a same-origin request was aborted.",
      hint: "Reload the page, then use Re-analyze.",
    };
  }
  if (/Could not read this page|inaccessible|Cannot access/i.test(message)) {
    return {
      title: "AgentLens couldn't read this page.",
      reason: "The content script could not access the rendered DOM.",
      hint: "Wait for the page to finish loading, then try again.",
    };
  }
  return {
    title: "We couldn't analyze this website.",
    reason: message.slice(0, 180),
    hint: "Check that the page is a public http(s) document, then use Re-analyze.",
  };
}

async function analyze(port: chrome.runtime.Port, force: boolean): Promise<void> {
  const tab = await activeTab();
  const tabId = tab.id!;
  const url = tab.url ?? "";
  send(port, { type: "STATE", state: "analyzing", url });

  if (isRestrictedUrl(url)) {
    send(port, { type: "ERROR", error: restrictedError(url) });
    return;
  }

  const cached = cache.get(tabId);
  if (!force && cached && cached.url === url) {
    lastResult = cached.result;
    send(port, { type: "RESULT", result: cached.result, cached: true });
    return;
  }

  send(port, { type: "STAGE", stage: "reading-dom" });
  const page = await collect(tabId);
  if (!page.html.trim()) {
    send(port, {
      type: "ERROR",
      error: {
        title: "AgentLens couldn't read this page.",
        reason: "The rendered DOM was empty.",
        hint: "Wait for the page to finish loading, then use Re-analyze.",
      },
    });
    return;
  }
  const result = await analyzeCollectedPage({
    ...page,
    onStage: (stage) => send(port, { type: "STAGE", stage }),
  });
  cache.set(tabId, { url: page.url, result });
  lastResult = result;
  applyBadge(tabId, result);
  send(port, { type: "RESULT", result });
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "agentlens") return;
  port.onMessage.addListener((message: PopupToBackground) => {
    void (async () => {
      try {
        if (message.type === "ANALYZE") {
          await analyze(port, Boolean(message.force));
          return;
        }
        if (message.type === "GET_STATE") {
          const tab = await activeTab();
          const entry = tab.id ? cache.get(tab.id) : undefined;
          if (entry && entry.url === tab.url) {
            send(port, { type: "RESULT", result: entry.result, cached: true });
          } else {
            send(port, { type: "STATE", state: "idle", url: tab.url });
          }
        }
      } catch (error) {
        const tab = await activeTab().catch(() => undefined);
        send(port, { type: "ERROR", error: toError(error, tab?.url) });
      }
    })();
  });
});

chrome.runtime.onMessage.addListener((message: PopupToBackground, sender, sendResponse) => {
  if (message.type === "GET_LAST_RESULT") {
    sendResponse({ type: "LAST_RESULT", result: lastResult } satisfies BackgroundToPopup);
    return false;
  }
  if (message.type === "OPEN_REPORT") {
    void (async () => {
      const tab = await activeTab().catch(() => undefined);
      const entry = tab?.id ? cache.get(tab.id) : undefined;
      if (entry) lastResult = entry.result;
      await chrome.tabs.create({ url: chrome.runtime.getURL("report.html") });
    })();
    sendResponse({ ok: true });
    return false;
  }
  if (message.type === "INSPECT") {
    void (async () => {
      const tabId = sender.tab?.id ?? (await activeTab()).id;
      if (!tabId) {
        sendResponse({ found: false, reason: "No active tab." } satisfies InspectResult);
        return;
      }
      await ensureContent(tabId);
      const payload: InspectPayload = message.payload;
      const result = (await chrome.tabs.sendMessage(tabId, { type: INSPECT_TYPE, payload })) as InspectResult;
      sendResponse(result);
    })();
    return true;
  }
  return false;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!changeInfo.url) return;
  const cached = cache.get(tabId);
  if (cached && cached.url !== changeInfo.url) {
    cache.delete(tabId);
    void chrome.action.setBadgeText({ tabId, text: "" });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  cache.delete(tabId);
});
