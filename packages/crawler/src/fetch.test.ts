import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSafe, RedirectError, ResponseTooLargeError, SsrfError } from "./index.js";

vi.mock("node:dns/promises", () => ({
  lookup: async () => [{ address: "93.184.216.34", family: 4 }],
}));

function jsonHeaders(init?: HeadersInit): Headers {
  return new Headers(init);
}

describe("fetchSafe", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the body for a public URL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>ok</html>", { status: 200, headers: { "content-type": "text/html" } })),
    );
    const result = await fetchSafe("https://example.com/");
    expect(result.statusCode).toBe(200);
    expect(result.body).toContain("ok");
    expect(result.redirectCount).toBe(0);
  });

  it("follows redirects and re-validates the destination", async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      const href = String(url);
      if (href === "https://example.com/") {
        return new Response(null, {
          status: 301,
          headers: jsonHeaders({ location: "https://www.example.com/" }),
        });
      }
      return new Response("landed", { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchSafe("https://example.com/");
    expect(result.finalUrl).toBe("https://www.example.com/");
    expect(result.redirectCount).toBe(1);
    expect(result.body).toBe("landed");
  });

  it("blocks redirects to private IPs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(null, {
          status: 302,
          headers: jsonHeaders({ location: "http://127.0.0.1/secret" }),
        }),
      ),
    );
    await expect(fetchSafe("https://example.com/")).rejects.toBeInstanceOf(SsrfError);
  });

  it("caps redirect loops", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(null, {
          status: 302,
          headers: jsonHeaders({ location: "https://example.com/next" }),
        }),
      ),
    );
    await expect(fetchSafe("https://example.com/", { maxRedirects: 2 })).rejects.toBeInstanceOf(
      RedirectError,
    );
  });

  it("rejects oversized bodies", async () => {
    const big = "x".repeat(1000);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(big, { status: 200 })),
    );
    await expect(fetchSafe("https://example.com/", { maxResponseBytes: 100 })).rejects.toBeInstanceOf(
      ResponseTooLargeError,
    );
  });
});
