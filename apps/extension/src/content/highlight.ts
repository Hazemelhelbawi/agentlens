import { copyText } from "../lib/copy.js";
import type { InspectPayload, InspectResult } from "../lib/messages.js";

const STYLE_ID = "agentlens-highlight-style";
const OVERLAY_ID = "agentlens-inspect-overlay";
const MARK_CLASS = "agentlens-highlight";

let hideTimer = 0;
let onKey: ((event: KeyboardEvent) => void) | null = null;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .${MARK_CLASS} {
      outline: 2px solid #2563eb !important;
      outline-offset: 3px !important;
      box-shadow: 0 0 0 4px rgb(37 99 235 / 0.3) !important;
      border-radius: 3px;
    }
    #${OVERLAY_ID} {
      position: fixed;
      z-index: 2147483646;
      max-width: 320px;
      padding: 12px 14px;
      border-radius: 8px;
      background: #14161b;
      color: #ececef;
      border: 1px solid #2a2d35;
      box-shadow: 0 10px 28px rgb(0 0 0 / 0.32);
      font: 12px/1.45 ui-sans-serif, system-ui, sans-serif;
    }
    #${OVERLAY_ID} .al-k { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #9a9aa3; margin: 0 0 4px; }
    #${OVERLAY_ID} strong { display: block; font-size: 13px; margin: 0 0 8px; }
    #${OVERLAY_ID} p { margin: 0 0 6px; color: #c4c4cc; }
    #${OVERLAY_ID} .al-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #9a9aa3; margin: 8px 0 2px; }
    #${OVERLAY_ID} code { display: block; font: 11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap; color: #93c5fd; }
    #${OVERLAY_ID} .al-actions { display: flex; gap: 6px; margin-top: 10px; }
    #${OVERLAY_ID} button {
      border: 1px solid #2a2d35; background: #0c0d10; color: #ececef;
      border-radius: 6px; padding: 4px 8px; font: 11px/1.2 ui-sans-serif, system-ui, sans-serif; cursor: pointer;
    }
    #${OVERLAY_ID} button:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }
    #${OVERLAY_ID}[data-theme="light"] { background: #fff; color: #18181b; border-color: #e4e4e7; }
    #${OVERLAY_ID}[data-theme="light"] p, #${OVERLAY_ID}[data-theme="light"] .al-k, #${OVERLAY_ID}[data-theme="light"] .al-label { color: #52525b; }
    #${OVERLAY_ID}[data-theme="light"] code { color: #1d4ed8; }
    #${OVERLAY_ID}[data-theme="light"] button { background: #f4f4f5; color: #18181b; border-color: #e4e4e7; }
  `;
  document.documentElement.appendChild(style);
}

export function clearHighlight(): void {
  document.querySelectorAll(`.${MARK_CLASS}`).forEach((node) => node.classList.remove(MARK_CLASS));
  document.getElementById(OVERLAY_ID)?.remove();
  if (hideTimer) window.clearTimeout(hideTimer);
  hideTimer = 0;
  if (onKey) {
    window.removeEventListener("keydown", onKey);
    onKey = null;
  }
}

function queryUnique(selector: string): Element | null {
  try {
    const matches = document.querySelectorAll(selector);
    return matches.length === 1 ? (matches[0] ?? null) : null;
  } catch {
    return null;
  }
}

function uniqueElements(payload: InspectPayload): Element[] {
  const selectors = [
    ...(payload.targets ?? []).filter((item) => item.unique).map((item) => item.selector),
    ...(payload.selector ? [payload.selector] : []),
  ];
  const seen = new Set<Element>();
  const elements: Element[] = [];
  for (const selector of [...new Set(selectors)]) {
    const node = queryUnique(selector);
    if (node && !seen.has(node)) {
      seen.add(node);
      elements.push(node);
    }
  }
  return elements;
}

export function highlightFinding(payload: InspectPayload): InspectResult {
  ensureStyle();
  clearHighlight();

  const elements = uniqueElements(payload);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (elements.length === 0) {
    mountOverlay(payload, null, true);
    return { found: false, reason: "Element is no longer available on this page." };
  }

  elements.forEach((el) => el.classList.add(MARK_CLASS));
  const first = elements[0]!;
  first.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  mountOverlay(payload, first, false);
  return { found: true };
}

function mountOverlay(payload: InspectPayload, target: Element | null, missing: boolean): void {
  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", "AgentLens inspect");
  overlay.dataset.theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

  const kicker = el("p", "al-k", "AgentLens");
  const title = document.createElement("strong");
  title.textContent = payload.title;
  overlay.append(kicker, title);

  if (missing) {
    overlay.append(el("p", "", "Element is no longer available on this page."));
    overlay.append(el("p", "", "AgentLens will not guess another element."));
  } else {
    if (payload.detected) {
      overlay.append(el("p", "al-label", "Detected"));
      overlay.append(el("code", "", payload.detected));
    }
    if (payload.why) {
      overlay.append(el("p", "al-label", "Why"));
      overlay.append(el("p", "", payload.why));
    } else if (payload.description) {
      overlay.append(el("p", "", payload.description));
    }
    if (payload.fix) {
      overlay.append(el("p", "al-label", "Recommended"));
      overlay.append(el("code", "", payload.fix));
    }
  }

  const actions = document.createElement("div");
  actions.className = "al-actions";
  if (payload.fix && !missing) {
    const copy = document.createElement("button");
    copy.type = "button";
    copy.textContent = "Copy fix";
    copy.addEventListener("click", async () => {
      const ok = await copyText(payload.fix ?? "");
      copy.textContent = ok ? "Copied" : "Copy failed";
      window.setTimeout(() => {
        copy.textContent = "Copy fix";
      }, 1200);
    });
    actions.append(copy);
  }
  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.textContent = "Dismiss";
  dismiss.addEventListener("click", () => clearHighlight());
  actions.append(dismiss);
  overlay.append(actions);
  document.documentElement.appendChild(overlay);

  if (target) positionOverlay(overlay, target);
  else {
    overlay.style.top = "16px";
    overlay.style.right = "16px";
  }

  onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") clearHighlight();
  };
  window.addEventListener("keydown", onKey);
  hideTimer = window.setTimeout(clearHighlight, 8000);
}

function el(tag: string, className: string, text: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  return node;
}

function positionOverlay(overlay: HTMLElement, target: Element): void {
  const rect = target.getBoundingClientRect();
  const top = Math.min(window.innerHeight - overlay.offsetHeight - 12, Math.max(12, rect.bottom + 8));
  const left = Math.min(window.innerWidth - overlay.offsetWidth - 12, Math.max(12, rect.left));
  overlay.style.top = `${top}px`;
  overlay.style.left = `${left}px`;
}
