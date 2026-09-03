export class CrawlerError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "CrawlerError";
    this.code = code;
  }
}

export class SsrfError extends CrawlerError {
  constructor(message: string) {
    super("SSRF_BLOCKED", message);
    this.name = "SsrfError";
  }
}

export class TimeoutError extends CrawlerError {
  constructor(message = "Request timed out") {
    super("TIMEOUT", message);
    this.name = "TimeoutError";
  }
}

export class ResponseTooLargeError extends CrawlerError {
  constructor(message = "Response exceeded maximum size") {
    super("RESPONSE_TOO_LARGE", message);
    this.name = "ResponseTooLargeError";
  }
}

export class RedirectError extends CrawlerError {
  constructor(message: string) {
    super("REDIRECT_LIMIT", message);
    this.name = "RedirectError";
  }
}
