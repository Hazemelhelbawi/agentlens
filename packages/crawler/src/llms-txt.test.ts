import { describe, expect, it } from "vitest";
import { parseLlmsTxt } from "./llms-txt.js";

describe("llms.txt", () => {
  it("detects title, description, and links", () => {
    const parsed = parseLlmsTxt(
      "# Site\n> Hello\n\n- [Docs](https://example.com/docs): intro\n",
      "/llms.txt",
      200,
    );
    expect(parsed.fetched).toBe(true);
    expect(parsed.hasTitle).toBe(true);
    expect(parsed.hasDescription).toBe(true);
    expect(parsed.linkCount).toBe(1);
  });
});
