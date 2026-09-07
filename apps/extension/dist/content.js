"use strict";
(() => {
  // src/lib/messages.ts
  var COLLECT_TYPE = "AGENTLENS_COLLECT";
  var INSPECT_TYPE = "AGENTLENS_INSPECT";

  // src/content/collect.ts
  var HTML_CAP = 15e5;
  var GENERIC_LINKS = /* @__PURE__ */ new Set([
    "click here",
    "read more",
    "learn more",
    "more",
    "here",
    "this",
    "link",
    "continue"
  ]);
  var GENERIC_BUTTONS = /* @__PURE__ */ new Set(["click here", "submit", "ok", "button", "learn more", "read more", "more"]);
  function uniqueCssPath(el2) {
    if (el2.id) {
      const selector2 = `#${CSS.escape(el2.id)}`;
      try {
        if (document.querySelectorAll(selector2).length === 1) return { selector: selector2, unique: true };
      } catch {
      }
    }
    const parts = [];
    let node = el2;
    while (node && node.nodeType === 1) {
      const current = node;
      const tag = current.tagName.toLowerCase();
      if (tag === "html") {
        parts.unshift("html");
        break;
      }
      const parent = current.parentElement;
      if (!parent) {
        parts.unshift(tag);
        break;
      }
      const same = Array.from(parent.children).filter((child) => child.tagName === current.tagName);
      const index = same.indexOf(current) + 1;
      parts.unshift(same.length > 1 ? `${tag}:nth-of-type(${index})` : tag);
      node = parent;
    }
    const selector = parts.join(" > ");
    let unique = false;
    try {
      unique = document.querySelectorAll(selector).length === 1;
    } catch {
      unique = false;
    }
    return { selector, unique };
  }
  function target(el2, ruleId) {
    const located = uniqueCssPath(el2);
    return {
      ruleId,
      selector: located.selector,
      unique: located.unique,
      tagName: el2.tagName.toLowerCase(),
      text: (el2.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80) || void 0,
      snippet: el2.outerHTML.slice(0, 240),
      href: el2 instanceof HTMLAnchorElement ? el2.getAttribute("href") ?? void 0 : void 0
    };
  }
  function accessibleName(el2) {
    const aria = el2.getAttribute("aria-label")?.trim();
    if (aria) return aria;
    if (el2.getAttribute("aria-labelledby")?.trim()) return el2.getAttribute("aria-labelledby").trim();
    const value = el2.getAttribute("value")?.trim();
    if (value) return value;
    const title = el2.getAttribute("title")?.trim();
    if (title) return title;
    const img = el2.querySelector("img[alt]");
    if (img?.getAttribute("alt")?.trim()) return img.getAttribute("alt").trim();
    return (el2.textContent ?? "").replace(/\s+/g, " ").trim();
  }
  function collectLiveTargets(limit = 8, lists) {
    const targets = [];
    const push = (item) => {
      if (targets.filter((existing) => existing.ruleId === item.ruleId).length < limit) {
        targets.push(item);
      }
    };
    const links = lists?.links ?? document.querySelectorAll("a[href]");
    links.forEach((el2) => {
      const href = el2.getAttribute("href")?.trim() ?? "";
      const name = accessibleName(el2);
      if (!href || href === "#" || !name || GENERIC_LINKS.has(name.toLowerCase())) {
        push(target(el2, "links"));
      }
    });
    const images = lists?.images ?? document.querySelectorAll("img");
    images.forEach((el2) => {
      if (!el2.hasAttribute("alt")) push(target(el2, "images-alt"));
    });
    const fields = lists?.fields ?? document.querySelectorAll("input, select, textarea");
    fields.forEach((el2) => {
      const type = (el2.getAttribute("type") ?? "text").toLowerCase();
      if (["hidden", "submit", "button", "reset", "image"].includes(type)) return;
      const id = el2.getAttribute("id");
      const aria = el2.getAttribute("aria-label") || el2.getAttribute("aria-labelledby");
      const labeled = Boolean(aria) || Boolean(id && document.querySelector(`label[for="${CSS.escape(id)}"]`));
      const wrapped = Boolean(el2.closest("label"));
      if (!labeled && !wrapped) push(target(el2, "forms"));
    });
    const buttons = lists?.buttons ?? document.querySelectorAll("button, [role='button'], input[type='button'], input[type='submit']");
    buttons.forEach((el2) => {
      const name = accessibleName(el2);
      if (!name || GENERIC_BUTTONS.has(name.toLowerCase())) push(target(el2, "interactive"));
    });
    const jsonLd = lists?.jsonLd ?? document.querySelectorAll('script[type="application/ld+json"]');
    jsonLd.forEach((el2) => push(target(el2, "json-ld")));
    const title = document.querySelector("title");
    if (title) push(target(title, "title"));
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) push(target(canonical, "canonical"));
    const description = document.querySelector('meta[name="description"]');
    if (description) push(target(description, "description"));
    return targets;
  }
  async function fetchOptional(path) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 4e3);
    try {
      const res = await fetch(new URL(path, location.origin).href, {
        signal: controller.signal,
        credentials: "omit"
      });
      const text = await res.text();
      return { status: res.status, body: res.ok ? text.slice(0, HTML_CAP) : null };
    } catch {
      return { status: 0, body: null };
    } finally {
      window.clearTimeout(timer);
    }
  }
  async function collectPage() {
    const raw = document.documentElement.outerHTML;
    const truncated = raw.length > HTML_CAP;
    const links = document.querySelectorAll("a[href]");
    const buttons = document.querySelectorAll("button, [role='button'], input[type='button'], input[type='submit']");
    const images = document.querySelectorAll("img");
    const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
    const forms = document.querySelectorAll("form");
    const jsonLd = document.querySelectorAll('script[type="application/ld+json"]');
    const fields = document.querySelectorAll("input, select, textarea");
    const inputs = document.querySelectorAll("input:not([type='hidden']), select, textarea");
    const [robots, sitemap, llmsTxt, llmsFullTxt] = await Promise.all([
      fetchOptional("/robots.txt"),
      fetchOptional("/sitemap.xml"),
      fetchOptional("/llms.txt"),
      fetchOptional("/llms-full.txt")
    ]);
    return {
      url: location.href,
      html: raw.slice(0, HTML_CAP),
      title: document.title,
      language: document.documentElement.lang || void 0,
      truncated,
      robots,
      sitemap,
      llmsTxt,
      llmsFullTxt,
      stats: {
        links: links.length,
        buttons: buttons.length,
        images: images.length,
        headings: headings.length,
        forms: forms.length,
        jsonLd: jsonLd.length,
        inputs: inputs.length
      },
      inspectTargets: collectLiveTargets(8, { links, images, fields, buttons, jsonLd })
    };
  }

  // src/lib/copy.ts
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.left = "-9999px";
        document.body.appendChild(area);
        area.select();
        const ok = typeof document.execCommand === "function" ? document.execCommand("copy") : false;
        area.remove();
        return ok;
      } catch {
        return false;
      }
    }
  }

  // src/content/highlight.ts
  var STYLE_ID = "agentlens-highlight-style";
  var OVERLAY_ID = "agentlens-inspect-overlay";
  var MARK_CLASS = "agentlens-highlight";
  var hideTimer = 0;
  var onKey = null;
  function ensureStyle() {
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
  function clearHighlight() {
    document.querySelectorAll(`.${MARK_CLASS}`).forEach((node) => node.classList.remove(MARK_CLASS));
    document.getElementById(OVERLAY_ID)?.remove();
    if (hideTimer) window.clearTimeout(hideTimer);
    hideTimer = 0;
    if (onKey) {
      window.removeEventListener("keydown", onKey);
      onKey = null;
    }
  }
  function queryUnique(selector) {
    try {
      const matches = document.querySelectorAll(selector);
      return matches.length === 1 ? matches[0] ?? null : null;
    } catch {
      return null;
    }
  }
  function uniqueElements(payload) {
    const selectors = [
      ...(payload.targets ?? []).filter((item) => item.unique).map((item) => item.selector),
      ...payload.selector ? [payload.selector] : []
    ];
    const seen = /* @__PURE__ */ new Set();
    const elements = [];
    for (const selector of [...new Set(selectors)]) {
      const node = queryUnique(selector);
      if (node && !seen.has(node)) {
        seen.add(node);
        elements.push(node);
      }
    }
    return elements;
  }
  function highlightFinding(payload) {
    ensureStyle();
    clearHighlight();
    const elements = uniqueElements(payload);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (elements.length === 0) {
      mountOverlay(payload, null, true);
      return { found: false, reason: "Element is no longer available on this page." };
    }
    elements.forEach((el2) => el2.classList.add(MARK_CLASS));
    const first = elements[0];
    first.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    mountOverlay(payload, first, false);
    return { found: true };
  }
  function mountOverlay(payload, target2, missing) {
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
    if (target2) positionOverlay(overlay, target2);
    else {
      overlay.style.top = "16px";
      overlay.style.right = "16px";
    }
    onKey = (event) => {
      if (event.key === "Escape") clearHighlight();
    };
    window.addEventListener("keydown", onKey);
    hideTimer = window.setTimeout(clearHighlight, 8e3);
  }
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = text;
    return node;
  }
  function positionOverlay(overlay, target2) {
    const rect = target2.getBoundingClientRect();
    const top = Math.min(window.innerHeight - overlay.offsetHeight - 12, Math.max(12, rect.bottom + 8));
    const left = Math.min(window.innerWidth - overlay.offsetWidth - 12, Math.max(12, rect.left));
    overlay.style.top = `${top}px`;
    overlay.style.left = `${left}px`;
  }

  // src/content/index.ts
  if (!window.__agentlensContent) {
    window.__agentlensContent = true;
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === COLLECT_TYPE) {
        collectPage().then((page) => sendResponse({ ok: true, page })).catch((error) => {
          sendResponse({
            ok: false,
            error: error instanceof Error ? error.message : "Could not read this page."
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
})();
//# sourceMappingURL=content.js.map
