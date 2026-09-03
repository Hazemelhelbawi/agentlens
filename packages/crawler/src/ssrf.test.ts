import { describe, expect, it } from "vitest";
import {
  assertPublicUrl,
  isBlockedHostname,
  isPrivateIp,
  normalizeUrl,
  SsrfError,
} from "./index.js";

describe("SSRF protection", () => {
  it("allows public http and https URLs", () => {
    expect(assertPublicUrl("https://example.com/path").hostname).toBe("example.com");
    expect(assertPublicUrl("http://example.com").protocol).toBe("http:");
  });

  it("rejects non-http protocols", () => {
    expect(() => assertPublicUrl("file:///etc/passwd")).toThrow(SsrfError);
    expect(() => assertPublicUrl("ftp://example.com")).toThrow(SsrfError);
    expect(() => assertPublicUrl("javascript:alert(1)")).toThrow(SsrfError);
  });

  it("rejects malformed URLs", () => {
    expect(() => assertPublicUrl("not a url")).toThrow(SsrfError);
  });

  it("rejects localhost and loopback", () => {
    expect(() => assertPublicUrl("http://localhost")).toThrow(SsrfError);
    expect(() => assertPublicUrl("http://127.0.0.1")).toThrow(SsrfError);
    expect(() => assertPublicUrl("http://0.0.0.0")).toThrow(SsrfError);
    expect(() => assertPublicUrl("http://[::1]")).toThrow(SsrfError);
  });

  it("rejects private and link-local ranges", () => {
    expect(() => assertPublicUrl("http://10.0.0.1")).toThrow(SsrfError);
    expect(() => assertPublicUrl("http://192.168.1.1")).toThrow(SsrfError);
    expect(() => assertPublicUrl("http://172.16.0.1")).toThrow(SsrfError);
    expect(() => assertPublicUrl("http://169.254.169.254")).toThrow(SsrfError);
    expect(() => assertPublicUrl("http://100.64.0.1")).toThrow(SsrfError);
  });

  it("rejects URLs with credentials", () => {
    expect(() => assertPublicUrl("https://user:pass@example.com")).toThrow(SsrfError);
  });

  it("detects blocked hostnames", () => {
    expect(isBlockedHostname("localhost")).toBe(true);
    expect(isBlockedHostname("foo.localhost")).toBe(true);
    expect(isBlockedHostname("metadata.google.internal")).toBe(true);
    expect(isBlockedHostname("example.com")).toBe(false);
  });

  it("classifies private IPs", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("8.8.8.8")).toBe(false);
    expect(isPrivateIp("::1")).toBe(true);
    expect(isPrivateIp("::ffff:127.0.0.1")).toBe(true);
  });

  it("normalizes URLs", () => {
    expect(normalizeUrl("https://example.com:443/")).toBe("https://example.com/");
    expect(normalizeUrl("http://example.com:80")).toBe("http://example.com/");
  });
});
