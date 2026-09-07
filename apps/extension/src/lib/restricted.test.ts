import { describe, expect, it } from "vitest";
import { isRestrictedUrl, restrictedError } from "./restricted.js";

describe("restricted pages", () => {
  it("blocks browser-internal URLs", () => {
    expect(isRestrictedUrl("chrome://extensions")).toBe(true);
    expect(isRestrictedUrl("edge://settings")).toBe(true);
    expect(isRestrictedUrl("about:blank")).toBe(true);
    expect(isRestrictedUrl("chrome-extension://abc/popup.html")).toBe(true);
    expect(isRestrictedUrl("https://chromewebstore.google.com/detail/x")).toBe(true);
    expect(isRestrictedUrl("file:///tmp/index.html")).toBe(true);
    expect(isRestrictedUrl("https://example.com")).toBe(false);
  });

  it("explains why inspection failed", () => {
    expect(restrictedError("chrome://newtab").reason).toMatch(/chrome:\/\//i);
    expect(restrictedError("chrome-extension://abc/popup.html").reason).toMatch(/extension:\/\//i);
    expect(restrictedError("file:///tmp/index.html").reason).toMatch(/file:\/\//i);
  });
});
