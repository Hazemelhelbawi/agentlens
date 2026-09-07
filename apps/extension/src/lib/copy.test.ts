import { describe, expect, it, vi } from "vitest";
import { copyText } from "./copy.js";

describe("copyText", () => {
  it("returns true when the clipboard API succeeds", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    await expect(copyText("hello")).resolves.toBe(true);
  });

  it("returns false when copying is blocked", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    document.execCommand = () => false;
    await expect(copyText("hello")).resolves.toBe(false);
  });
});
