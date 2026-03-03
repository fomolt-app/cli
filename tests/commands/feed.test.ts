import { test, expect, beforeEach, afterEach, mock } from "bun:test";

let stdout: string[] = [];
const originalWrite = process.stdout.write;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  stdout = [];
  process.stdout.write = ((chunk: string) => { stdout.push(chunk); return true; }) as any;
});

afterEach(() => {
  process.stdout.write = originalWrite;
  globalThis.fetch = originalFetch;
});

test("feed returns trades without auth", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({ success: true, response: { trades: [{ type: "paper-dex", symbol: "CASHU", side: "buy" }], pagination: { hasMore: false } } }),
        { status: 200, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
      )
    )
  );
  globalThis.fetch = mockFetch as any;
  const { handleFeed } = await import("../../src/commands/feed");
  await handleFeed({ limit: "20" }, { apiUrl: "https://fomolt.test" });
  const call = mockFetch.mock.calls[0];
  expect(call[1].headers["Authorization"]).toBeUndefined();
  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.trades[0].symbol).toBe("CASHU");
});

test("ohlcv fetches candle data without auth", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({ success: true, response: { candles: [{ open: "1.00", high: "1.05", low: "0.99", close: "1.02", volume: "5000" }] } }),
        { status: 200, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
      )
    )
  );
  globalThis.fetch = mockFetch as any;
  const { handleOhlcv } = await import("../../src/commands/feed");
  await handleOhlcv({ token: "0x1234567890abcdef1234567890abcdef12345678", type: "1H", from: "1700000000", to: "1700003600" }, { apiUrl: "https://fomolt.test" });
  const url = new URL(mockFetch.mock.calls[0][0]);
  expect(url.pathname).toContain("/token/0x1234567890abcdef1234567890abcdef12345678/ohlcv");
  expect(url.searchParams.get("type")).toBe("1H");
  expect(url.searchParams.get("time_from")).toBe("1700000000");
  expect(url.searchParams.get("time_to")).toBe("1700003600");
  const call = mockFetch.mock.calls[0];
  expect(call[1].headers["Authorization"]).toBeUndefined();
  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.candles[0].open).toBe("1.00");
});

test("ohlcv auto-generates time_from and time_to when omitted", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({ success: true, response: { items: [] } }),
        { status: 200, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
      )
    )
  );
  globalThis.fetch = mockFetch as any;
  const { handleOhlcv } = await import("../../src/commands/feed");
  await handleOhlcv({ token: "0x1234567890abcdef1234567890abcdef12345678", type: "1H" }, { apiUrl: "https://fomolt.test" });
  const url = new URL(mockFetch.mock.calls[0][0]);
  expect(url.searchParams.get("type")).toBe("1H");
  // Should auto-generate time_from and time_to
  const timeFrom = url.searchParams.get("time_from");
  const timeTo = url.searchParams.get("time_to");
  expect(timeFrom).not.toBeNull();
  expect(timeTo).not.toBeNull();
  const from = Number(timeFrom);
  const to = Number(timeTo);
  expect(to - from).toBe(604800); // 7 days for hourly
});

test("ohlcv sub-minute type uses 1 hour default range", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({ success: true, response: { items: [] } }),
        { status: 200, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
      )
    )
  );
  globalThis.fetch = mockFetch as any;
  const { handleOhlcv } = await import("../../src/commands/feed");
  await handleOhlcv({ token: "0x1234567890abcdef1234567890abcdef12345678", type: "1S" }, { apiUrl: "https://fomolt.test" });
  const url = new URL(mockFetch.mock.calls[0][0]);
  const from = Number(url.searchParams.get("time_from"));
  const to = Number(url.searchParams.get("time_to"));
  expect(to - from).toBe(3600); // 1 hour for sub-minute
});

test("spec returns API manifest without auth", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({ success: true, response: { version: "3.0.0", endpoints: [] } }),
        { status: 200, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
      )
    )
  );
  globalThis.fetch = mockFetch as any;
  const { handleSpec } = await import("../../src/commands/feed");
  await handleSpec({ apiUrl: "https://fomolt.test" });
  const call = mockFetch.mock.calls[0];
  expect(call[1].headers["Authorization"]).toBeUndefined();
  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.version).toBe("3.0.0");
});
