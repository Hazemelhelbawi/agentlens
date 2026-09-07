import { COLLECT_TYPE, INSPECT_TYPE, type InspectPayload } from "../lib/messages.js";
import { collectPage } from "./collect.js";
import { clearHighlight, highlightFinding } from "./highlight.js";

declare global {
  interface Window {
    __agentlensContent?: boolean;
  }
}

if (!window.__agentlensContent) {
  window.__agentlensContent = true;
  chrome.runtime.onMessage.addListener((message: { type?: string; payload?: InspectPayload }, _sender, sendResponse) => {
    if (message.type === COLLECT_TYPE) {
      collectPage()
        .then((page) => sendResponse({ ok: true, page }))
        .catch((error: unknown) => {
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : "Could not read this page.",
          });
        });
      return true;
    }
    if (message.type === INSPECT_TYPE && message.payload) {
      const result = highlightFinding(message.payload);
      sendResponse(result);
      return false;
    }
    if (message.type === "AGENTLENS_CLEAR_INSPECT") {
      clearHighlight();
      sendResponse({ ok: true });
    }
    return false;
  });
}
