import { isIP } from "node:net";
import { SsrfError } from "./errors.js";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.google.com",
  "instance-data",
]);

const BLOCKED_HOSTNAME_SUFFIXES = [".localhost", ".local", ".internal", ".lan"];

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    n = (n << 8) + octet;
  }
  return n >>> 0;
}

function inCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split("/");
  if (!range || bitsStr === undefined) return false;
  const bits = Number(bitsStr);
  const ipInt = ipv4ToInt(ip);
  const rangeInt = ipv4ToInt(range);
  if (ipInt === null || rangeInt === null) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

const PRIVATE_V4_CIDRS = [
  "0.0.0.0/8",
  "10.0.0.0/8",
  "100.64.0.0/10",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "172.16.0.0/12",
  "192.0.0.0/24",
  "192.0.2.0/24",
  "192.168.0.0/16",
  "198.18.0.0/15",
  "198.51.100.0/24",
  "203.0.113.0/24",
  "224.0.0.0/4",
  "240.0.0.0/4",
  "255.255.255.255/32",
];

function isPrivateIpv4(ip: string): boolean {
  return PRIVATE_V4_CIDRS.some((cidr) => inCidr(ip, cidr));
}

function normalizeIpv6(ip: string): string {
  return ip.toLowerCase().replace(/^\[|\]$/g, "");
}

function isPrivateIpv6(ip: string): boolean {
  const n = normalizeIpv6(ip);

  if (n === "::" || n === "::1") return true;
  if (n.startsWith("fe80:") || n.startsWith("fe8") || n.startsWith("fe9") || n.startsWith("fea") || n.startsWith("feb")) {
    return true;
  }
  if (n.startsWith("fc") || n.startsWith("fd")) return true;
  if (n.startsWith("ff")) return true;

  const v4Mapped = n.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (v4Mapped?.[1]) return isPrivateIpv4(v4Mapped[1]);

  const v4MappedHex = n.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (v4MappedHex?.[1] && v4MappedHex[2]) {
    const hi = parseInt(v4MappedHex[1], 16);
    const lo = parseInt(v4MappedHex[2], 16);
    const dotted = `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
    return isPrivateIpv4(dotted);
  }

  return false;
}

export function isPrivateIp(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return isPrivateIpv4(ip);
  if (kind === 6) return isPrivateIpv6(ip);
  return true;
}

export function isBlockedHostname(hostname: string): boolean {
  const host = hostname.replace(/\.$/, "").toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (BLOCKED_HOSTNAME_SUFFIXES.some((s) => host.endsWith(s))) return true;
  if (host === "0.0.0.0" || host === "::" || host === "[::1]" || host === "::1") return true;
  return false;
}

export function assertPublicUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new SsrfError(`Malformed URL: ${raw}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new SsrfError(`Only http: and https: URLs are allowed (got ${parsed.protocol})`);
  }

  if (parsed.username || parsed.password) {
    throw new SsrfError("URLs with credentials are not allowed");
  }

  const hostname = parsed.hostname;
  if (!hostname) {
    throw new SsrfError("URL is missing a hostname");
  }

  if (isBlockedHostname(hostname)) {
    throw new SsrfError(`Blocked hostname: ${hostname}`);
  }

  if (isIP(hostname) && isPrivateIp(hostname)) {
    throw new SsrfError(`Private or reserved IP address is not allowed: ${hostname}`);
  }

  return parsed;
}

export function normalizeUrl(raw: string): string {
  const url = assertPublicUrl(raw);
  url.hash = "";
  if (
    (url.protocol === "http:" && url.port === "80") ||
    (url.protocol === "https:" && url.port === "443")
  ) {
    url.port = "";
  }
  if (url.pathname === "") url.pathname = "/";
  return url.href;
}

export function originOf(raw: string): string {
  return new URL(raw).origin;
}

export function isSameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

export function resolveUrl(base: string, href: string): string | null {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}
