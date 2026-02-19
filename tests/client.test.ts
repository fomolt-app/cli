import { test, expect, beforeEach, afterEach, mock } from "bun:test";
import { FomoltClient } from "../src/client";

let client: FomoltClient;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  client = new FomoltClient({
    apiUrl: "https://fomolt.test",
    apiKey: "test-api-key",
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("GET request with auth header", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({ success: true, response: { balance: "1000" } }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": "req-1",
          },
        }
      )
    )
  );
  globalThis.fetch = mockFetch as any;

  const result = await client.get("/agent/me");
  expect(result).toEqual({ balance: "1000" });
  expect(mockFetch).toHaveBeenCalledTimes(1);

  const call = mockFetch.mock.calls[0];
  expect(call[0]).toBe("https://fomolt.test/api/v1/agent/me");
  expect(call[1].headers["Authorization"]).toBe("Bearer test-api-key");
});

test("POST request with body", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          response: { trade: { id: "t1" } },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": "req-2",
          },
        }
      )
    )
  );
  globalThis.fetch = mockFetch as any;

  const result = await client.post("/agent/paper/dex/trade", {
    contractAddress: "0x123",
    side: "buy",
    amountUsdc: "100",
  });
  expect(result).toEqual({ trade: { id: "t1" } });

  const call = mockFetch.mock.calls[0];
  expect(call[1].method).toBe("POST");
  expect(JSON.parse(call[1].body)).toEqual({
    contractAddress: "0x123",
    side: "buy",
    amountUsdc: "100",
  });
});

test("API error is thrown with code", async () => {
  globalThis.fetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({ success: false, response: "Insufficient funds" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": "req-3",
          },
        }
      )
    )
  ) as any;

  try {
    await client.get("/agent/paper/dex/portfolio");
    expect(true).toBe(false);
  } catch (err: any) {
    expect(err.message).toBe("Insufficient funds");
    expect(err.statusCode).toBe(400);
    expect(err.requestId).toBe("req-3");
  }
});

test("rate limit error includes retryAfter", async () => {
  globalThis.fetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({ success: false, response: "Rate limit exceeded" }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": "req-4",
            "Retry-After": "45",
          },
        }
      )
    )
  ) as any;

  try {
    await client.get("/agent/me");
    expect(true).toBe(false);
  } catch (err: any) {
    expect(err.code).toBe("RATE_LIMITED");
    expect(err.retryAfter).toBe(45);
  }
});

test("network error is wrapped", async () => {
  globalThis.fetch = mock(() =>
    Promise.reject(new Error("fetch failed"))
  ) as any;

  try {
    await client.get("/agent/me");
    expect(true).toBe(false);
  } catch (err: any) {
    expect(err.code).toBe("NETWORK_ERROR");
    expect(err.message).toContain("fetch failed");
  }
});

test("GET without auth (for public endpoints)", async () => {
  const noAuthClient = new FomoltClient({ apiUrl: "https://fomolt.test" });
  const mockFetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({ success: true, response: { trades: [] } }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": "req-5",
          },
        }
      )
    )
  );
  globalThis.fetch = mockFetch as any;

  const result = await noAuthClient.get("/trades");
  expect(result).toEqual({ trades: [] });

  const call = mockFetch.mock.calls[0];
  expect(call[1].headers["Authorization"]).toBeUndefined();
});
