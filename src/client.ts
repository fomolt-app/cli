export class ApiError extends Error {
  statusCode: number;
  code: string;
  requestId: string;
  retryAfter?: number;
  hint?: string;

  constructor(opts: {
    message: string;
    statusCode: number;
    code: string;
    requestId: string;
    retryAfter?: number;
    hint?: string;
  }) {
    super(opts.message);
    this.statusCode = opts.statusCode;
    this.code = opts.code;
    this.requestId = opts.requestId;
    this.retryAfter = opts.retryAfter;
    this.hint = opts.hint;
  }
}

export interface ClientOptions {
  apiUrl: string;
  apiKey?: string;
}

export class FomoltClient {
  private apiUrl: string;
  private apiKey?: string;

  constructor(opts: ClientOptions) {
    this.apiUrl = opts.apiUrl.replace(/\/$/, "");
    this.apiKey = opts.apiKey;
  }

  async get(path: string, params?: Record<string, string>): Promise<any> {
    let url = `${this.apiUrl}/api/v1${path}`;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      if (qs) url += `?${qs}`;
    }
    return this.request(url, { method: "GET" });
  }

  async post(path: string, body?: Record<string, unknown>): Promise<any> {
    const url = `${this.apiUrl}/api/v1${path}`;
    return this.request(url, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch(path: string, body: Record<string, unknown>): Promise<any> {
    const url = `${this.apiUrl}/api/v1${path}`;
    return this.request(url, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  private async request(
    url: string,
    init: { method: string; body?: string }
  ): Promise<any> {
    const headers: Record<string, string> = {};

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    if (init.body) {
      headers["Content-Type"] = "application/json";
    }

    let res: Response;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);
      res = await fetch(url, {
        method: init.method,
        headers,
        body: init.body,
        signal: controller.signal,
      });
      clearTimeout(timeout);
    } catch (err: any) {
      throw new ApiError({
        message: `Network error: ${err.message}`,
        statusCode: 0,
        code: "NETWORK_ERROR",
        requestId: "",
      });
    }

    const requestId = res.headers.get("X-Request-Id") ?? "";
    let json: any;
    try {
      json = await res.json();
    } catch {
      throw new ApiError({
        message: `Server returned non-JSON response (HTTP ${res.status})`,
        statusCode: res.status,
        code: `HTTP_${res.status}`,
        requestId,
      });
    }

    if (!json.success) {
      const message =
        typeof json.response === "string"
          ? json.response
          : JSON.stringify(json.response);

      const code =
        json.error?.code ??
        (res.status === 429 ? "RATE_LIMITED" : `HTTP_${res.status}`);

      const retryAfter = res.headers.get("Retry-After");
      const hint = json.error?.hintCLI;

      throw new ApiError({
        message,
        statusCode: res.status,
        code,
        requestId,
        retryAfter: retryAfter ? parseInt(retryAfter, 10) : undefined,
        hint: typeof hint === "string" ? hint : undefined,
      });
    }

    return json.response;
  }
}
