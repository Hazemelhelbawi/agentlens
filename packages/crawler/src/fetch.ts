import {
  DEFAULT_MAX_REDIRECTS,
  DEFAULT_MAX_RESPONSE_BYTES,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_USER_AGENT,
} from "@agentlens/shared";
import { assertSafeDestination } from "./dns.js";
import {
  RedirectError,
  ResponseTooLargeError,
  TimeoutError,
} from "./errors.js";
import { normalizeUrl } from "./ssrf.js";

export interface FetchOptions {
  timeoutMs?: number;
  maxResponseBytes?: number;
  maxRedirects?: number;
  userAgent?: string;
  method?: "GET" | "HEAD";
}

export interface FetchedResource {
  requestedUrl: string;
  finalUrl: string;
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  bytes: number;
  redirectCount: number;
  responseTimeMs: number;
  contentType: string | undefined;
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function headerMap(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
}

async function readLimitedBody(
  response: Response,
  maxBytes: number,
): Promise<{ body: string; bytes: number }> {
  if (!response.body) {
    return { body: "", bytes: 0 };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new ResponseTooLargeError(
          `Response exceeded maximum size of ${maxBytes} bytes`,
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { body: new TextDecoder("utf-8", { fatal: false }).decode(merged), bytes };
}

export async function fetchSafe(
  rawUrl: string,
  options: FetchOptions = {},
): Promise<FetchedResource> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
  const method = options.method ?? "GET";

  let current = normalizeUrl(rawUrl);
  const requestedUrl = current;
  let redirectCount = 0;
  const started = Date.now();

  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertSafeDestination(current);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(current, {
        method,
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": userAgent,
          Accept: "text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.8",
        },
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new TimeoutError(`Request timed out after ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }

    if (REDIRECT_STATUSES.has(response.status)) {
      const location = response.headers.get("location");
      if (!location) {
        throw new RedirectError("Redirect response is missing a Location header");
      }
      if (hop === maxRedirects) {
        throw new RedirectError(`Exceeded maximum of ${maxRedirects} redirects`);
      }
      const next = new URL(location, current).href;
      current = normalizeUrl(next);
      redirectCount += 1;
      continue;
    }

    const { body, bytes } =
      method === "HEAD"
        ? { body: "", bytes: 0 }
        : await readLimitedBody(response, maxBytes);

    const headers = headerMap(response.headers);
    return {
      requestedUrl,
      finalUrl: current,
      statusCode: response.status,
      headers,
      body,
      bytes,
      redirectCount,
      responseTimeMs: Date.now() - started,
      contentType: headers["content-type"],
    };
  }

  throw new RedirectError(`Exceeded maximum of ${maxRedirects} redirects`);
}
