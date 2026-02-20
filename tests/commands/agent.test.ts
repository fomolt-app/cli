import { test, expect, beforeEach, afterEach, mock } from "bun:test";

let stdout: string[] = [];
let stderr: string[] = [];
const originalWrite = process.stdout.write;
const originalStderrWrite = process.stderr.write;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  stdout = [];
  stderr = [];
  process.stdout.write = ((chunk: string) => { stdout.push(chunk); return true; }) as any;
  process.stderr.write = ((chunk: string) => { stderr.push(chunk); return true; }) as any;
});

afterEach(() => {
  process.stdout.write = originalWrite;
  process.stderr.write = originalStderrWrite;
  globalThis.fetch = originalFetch;
});

test("profile returns agent data without auth header", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          response: {
            name: "alpha-trader",
            stats: { totalTrades: 42, winRate: 0.68 },
            recentTrades: [{ id: "t1", side: "buy", contractAddress: "0xabc" }],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
      )
    )
  );
  globalThis.fetch = mockFetch as any;
  const { handleAgentProfile } = await import("../../src/commands/agent");
  await handleAgentProfile("alpha-trader", { apiUrl: "https://fomolt.test" });

  const call = mockFetch.mock.calls[0];
  expect(call[1].headers["Authorization"]).toBeUndefined();
  expect(call[0]).toContain("/agent/alpha-trader");

  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.name).toBe("alpha-trader");
  expect(output.data.stats.totalTrades).toBe(42);
});

test("profile encodes special characters in name", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({ success: true, response: { name: "agent/special" } }),
        { status: 200, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
      )
    )
  );
  globalThis.fetch = mockFetch as any;
  const { handleAgentProfile } = await import("../../src/commands/agent");
  await handleAgentProfile("agent/special", { apiUrl: "https://fomolt.test" });

  const call = mockFetch.mock.calls[0];
  expect(call[0]).toContain("/agent/agent%2Fspecial");
});

test("trades without cursor or limit omits query params", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          response: { trades: [], pagination: { hasMore: false } },
        }),
        { status: 200, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
      )
    )
  );
  globalThis.fetch = mockFetch as any;
  const { handleAgentTrades } = await import("../../src/commands/agent");
  await handleAgentTrades("some-agent", {}, { apiUrl: "https://fomolt.test" });

  const call = mockFetch.mock.calls[0];
  const url: string = call[0];
  expect(url).toContain("/agent/some-agent/trades");
  expect(url).not.toContain("cursor=");
  expect(url).not.toContain("limit=");
});

test("trades encodes special characters in name", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({ success: true, response: { trades: [] } }),
        { status: 200, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
      )
    )
  );
  globalThis.fetch = mockFetch as any;
  const { handleAgentTrades } = await import("../../src/commands/agent");
  await handleAgentTrades("agent with spaces", {}, { apiUrl: "https://fomolt.test" });

  const call = mockFetch.mock.calls[0];
  expect(call[0]).toContain("/agent/agent%20with%20spaces/trades");
});

test("profile propagates API errors", async () => {
  globalThis.fetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({ success: false, response: "Agent not found" }),
        { status: 404, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
      )
    )
  ) as any;
  const { handleAgentProfile } = await import("../../src/commands/agent");
  const { ApiError } = await import("../../src/client");
  await expect(
    handleAgentProfile("nonexistent", { apiUrl: "https://fomolt.test" })
  ).rejects.toBeInstanceOf(ApiError);
});

test("trades propagates API errors", async () => {
  globalThis.fetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({ success: false, response: "Agent not found" }),
        { status: 404, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
      )
    )
  ) as any;
  const { handleAgentTrades } = await import("../../src/commands/agent");
  const { ApiError } = await import("../../src/client");
  await expect(
    handleAgentTrades("nonexistent", {}, { apiUrl: "https://fomolt.test" })
  ).rejects.toBeInstanceOf(ApiError);
});

test("profile uses correct API path", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({ success: true, response: { name: "test" } }),
        { status: 200, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
      )
    )
  );
  globalThis.fetch = mockFetch as any;
  const { handleAgentProfile } = await import("../../src/commands/agent");
  await handleAgentProfile("test", { apiUrl: "https://fomolt.test" });

  const call = mockFetch.mock.calls[0];
  expect(call[0]).toBe("https://fomolt.test/api/v1/agent/test");
  expect(call[1].method).toBe("GET");
});

test("trades returns paginated results without auth header", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          response: {
            trades: [
              { id: "t1", side: "buy", contractAddress: "0xabc" },
              { id: "t2", side: "sell", contractAddress: "0xdef" },
            ],
            pagination: { hasMore: true, cursor: "t2" },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
      )
    )
  );
  globalThis.fetch = mockFetch as any;
  const { handleAgentTrades } = await import("../../src/commands/agent");
  await handleAgentTrades("alpha-trader", { limit: "10", cursor: "t0" }, { apiUrl: "https://fomolt.test" });

  const call = mockFetch.mock.calls[0];
  expect(call[1].headers["Authorization"]).toBeUndefined();
  expect(call[0]).toContain("/agent/alpha-trader/trades");
  expect(call[0]).toContain("limit=10");
  expect(call[0]).toContain("cursor=t0");

  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.trades).toHaveLength(2);
  expect(output.data.pagination.hasMore).toBe(true);
});

// --- Validation tests ---

test("--limit rejects non-numeric", async () => {
  const originalExit = process.exit;
  process.exit = ((code: number) => { throw new Error(`EXIT_${code}`); }) as any;
  try {
    const { handleAgentTrades } = await import("../../src/commands/agent");
    await handleAgentTrades("x", { limit: "abc" }, { apiUrl: "https://fomolt.test" });
    expect.unreachable("should have exited");
  } catch (e: any) {
    expect(e.message).toBe("EXIT_1");
  }
  process.exit = originalExit;
  const output = JSON.parse(stderr.join(""));
  expect(output.code).toBe("VALIDATION_ERROR");
  expect(output.error).toContain("--limit");
});

test("--limit rejects out-of-range", async () => {
  const originalExit = process.exit;
  process.exit = ((code: number) => { throw new Error(`EXIT_${code}`); }) as any;
  try {
    const { handleAgentTrades } = await import("../../src/commands/agent");
    await handleAgentTrades("x", { limit: "200" }, { apiUrl: "https://fomolt.test" });
    expect.unreachable("should have exited");
  } catch (e: any) {
    expect(e.message).toBe("EXIT_1");
  }
  process.exit = originalExit;
  const output = JSON.parse(stderr.join(""));
  expect(output.code).toBe("VALIDATION_ERROR");
  expect(output.error).toContain("--limit");
});

test("--limit rejects zero", async () => {
  const originalExit = process.exit;
  process.exit = ((code: number) => { throw new Error(`EXIT_${code}`); }) as any;
  try {
    const { handleAgentTrades } = await import("../../src/commands/agent");
    await handleAgentTrades("x", { limit: "0" }, { apiUrl: "https://fomolt.test" });
    expect.unreachable("should have exited");
  } catch (e: any) {
    expect(e.message).toBe("EXIT_1");
  }
  process.exit = originalExit;
  const output = JSON.parse(stderr.join(""));
  expect(output.code).toBe("VALIDATION_ERROR");
  expect(output.error).toContain("--limit");
});
