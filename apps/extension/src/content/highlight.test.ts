import { describe, expect, it, beforeEach } from "vitest";
import { clearHighlight, highlightFinding } from "./highlight.js";

describe("inspect highlight", () => {
  beforeEach(() => {
    document.body.innerHTML = `<main><button id="cta">Click here</button></main>`;
    clearHighlight();
  });

  it("highlights a unique selector and shows an overlay", () => {
    const result = highlightFinding({
      title: "Weak button label",
      description: '"Click here" does not clearly describe the action.',
      fix: "<button>Start free trial</button>",
      selector: "#cta",
    });
    expect(result.found).toBe(true);
    expect(document.querySelector("#cta")?.classList.contains("agentlens-highlight")).toBe(true);
    expect(document.getElementById("agentlens-inspect-overlay")?.textContent).toMatch(/Weak button label/);
  });

  it("reports missing evidence instead of inventing a target", () => {
    const result = highlightFinding({ title: "Missing", description: "None", selector: "#nope" });
    expect(result.found).toBe(false);
    expect(result.reason).toMatch(/no longer available/);
    expect(document.getElementById("agentlens-inspect-overlay")?.textContent).toMatch(/no longer available/);
  });

  it("does not highlight the first match when the selector is not unique", () => {
    document.body.innerHTML = `<button class="x">One</button><button class="x">Two</button>`;
    const result = highlightFinding({ title: "Buttons", description: "Ambiguous", selector: "button.x" });
    expect(result.found).toBe(false);
    expect(document.querySelectorAll(".agentlens-highlight").length).toBe(0);
  });
});
