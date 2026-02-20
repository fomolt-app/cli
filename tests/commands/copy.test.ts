import { test, expect, beforeEach, afterEach, mock } from "bun:test";

let stdout: string[] = [];
let stderr: string[] = [];
const originalStdoutWrite = process.stdout.write;
const originalStderrWrite = process.stderr.write;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  stdout = [];
  stderr = [];
  process.stdout.write = ((chunk: string) => { stdout.push(chunk); return true; }) as any;
  process.stderr.write = ((chunk: string) => { stderr.push(chunk); return true; }) as any;
});

afterEach(() => {
  process.stdout.write = originalStdoutWrite;
  process.stderr.write = originalStderrWrite;
  globalThis.fetch = originalFetch;
});

function apiResponse(response: unknown) {
  return new Response(
    JSON.stringify({ success: true, response }),
    { status: 200, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
  );
}

test("first tick emits started event without mirroring", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      apiResponse({
        trades: [
          { id: "t5", side: "buy", contractAddress: "0xabc", amountUsdc: "100" },
          { id: "t4", side: "sell", contractAddress: "0xdef", quantity: "50" },
        ],
      })
    )
  );
  globalThis.fetch = mockFetch as any;
  const { copyAgent } = await import("../../src/commands/copy");
  await copyAgent(
    "target-agent",
    { market: "paper" },
    { apiUrl: "https://fomolt.test", apiKey: "k" },
    { once: true }
  );

  // Only one fetch call (reading trades) — no mirror trades executed
  expect(mockFetch.mock.calls).toHaveLength(1);

  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.event).toBe("started");
  expect(output.data.agent).toBe("target-agent");
  expect(output.data.lastSeenId).toBe("t5");
});

test("second tick detects and mirrors new trades", async () => {
  let callCount = 0;
  const mockFetch = mock(() => {
    callCount++;
    if (callCount === 1) {
      // Read target trades — returns new trade t6 and the already-seen t5
      return Promise.resolve(
        apiResponse({
          trades: [
            { id: "t6", side: "buy", contractAddress: "0xnew", amountUsdc: "200" },
            { id: "t5", side: "buy", contractAddress: "0xabc", amountUsdc: "100" },
          ],
        })
      );
    }
    // Mirror trade execution
    return Promise.resolve(
      apiResponse({ tradeId: "my-t1", side: "buy", contractAddress: "0xnew" })
    );
  });
  globalThis.fetch = mockFetch as any;
  const { copyAgent } = await import("../../src/commands/copy");

  // Use initialCursor to skip the first-tick "started" behavior
  await copyAgent(
    "target-agent",
    { market: "paper" },
    { apiUrl: "https://fomolt.test", apiKey: "k" },
    { once: true, initialCursor: "t5" }
  );

  // Should have fetched trades (1) then mirrored the new trade (1) = 2 calls
  expect(mockFetch.mock.calls).toHaveLength(2);

  // Verify mirror trade was sent to paper endpoint
  const mirrorCall = mockFetch.mock.calls[1];
  expect(mirrorCall[0]).toContain("/agent/paper/dex/trade");
  const mirrorBody = JSON.parse(mirrorCall[1].body);
  expect(mirrorBody.contractAddress).toBe("0xnew");
  expect(mirrorBody.side).toBe("buy");
  expect(mirrorBody.amountUsdc).toBe("200");
  expect(mirrorBody.note).toBe("copy:target-agent");

  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.event).toBe("mirror");
});

test("--max-usdc caps buy amount", async () => {
  let callCount = 0;
  const mockFetch = mock(() => {
    callCount++;
    if (callCount === 1) {
      return Promise.resolve(
        apiResponse({
          trades: [
            { id: "t6", side: "buy", contractAddress: "0xabc", amountUsdc: "500" },
            { id: "t5", side: "buy", contractAddress: "0xold", amountUsdc: "100" },
          ],
        })
      );
    }
    return Promise.resolve(apiResponse({ tradeId: "my-t1" }));
  });
  globalThis.fetch = mockFetch as any;
  const { copyAgent } = await import("../../src/commands/copy");
  await copyAgent(
    "target-agent",
    { market: "paper", maxUsdc: "50" },
    { apiUrl: "https://fomolt.test", apiKey: "k" },
    { once: true, initialCursor: "t5" }
  );

  const mirrorCall = mockFetch.mock.calls[1];
  const mirrorBody = JSON.parse(mirrorCall[1].body);
  expect(mirrorBody.amountUsdc).toBe("50");
});

test("sell mirrors quantity", async () => {
  let callCount = 0;
  const mockFetch = mock(() => {
    callCount++;
    if (callCount === 1) {
      return Promise.resolve(
        apiResponse({
          trades: [
            { id: "t6", side: "sell", contractAddress: "0xabc", quantity: "1000" },
            { id: "t5", side: "buy", contractAddress: "0xold", amountUsdc: "100" },
          ],
        })
      );
    }
    return Promise.resolve(apiResponse({ tradeId: "my-t1" }));
  });
  globalThis.fetch = mockFetch as any;
  const { copyAgent } = await import("../../src/commands/copy");
  await copyAgent(
    "target-agent",
    { market: "paper" },
    { apiUrl: "https://fomolt.test", apiKey: "k" },
    { once: true, initialCursor: "t5" }
  );

  const mirrorCall = mockFetch.mock.calls[1];
  const mirrorBody = JSON.parse(mirrorCall[1].body);
  expect(mirrorBody.side).toBe("sell");
  expect(mirrorBody.quantity).toBe("1000");
  expect(mirrorBody.amountUsdc).toBeUndefined();
});

test("mirror failure does not kill daemon", async () => {
  let callCount = 0;
  const mockFetch = mock(() => {
    callCount++;
    if (callCount === 1) {
      return Promise.resolve(
        apiResponse({
          trades: [
            { id: "t7", side: "buy", contractAddress: "0xfail", amountUsdc: "100" },
            { id: "t6", side: "buy", contractAddress: "0xok", amountUsdc: "50" },
            { id: "t5", side: "buy", contractAddress: "0xold", amountUsdc: "10" },
          ],
        })
      );
    }
    if (callCount === 2) {
      // First mirror fails
      return Promise.resolve(
        new Response(
          JSON.stringify({ success: false, response: "Insufficient balance" }),
          { status: 400, headers: { "Content-Type": "application/json", "X-Request-Id": "r2" } }
        )
      );
    }
    // Second mirror succeeds
    return Promise.resolve(apiResponse({ tradeId: "my-t1" }));
  });
  globalThis.fetch = mockFetch as any;
  const { copyAgent } = await import("../../src/commands/copy");

  // Should not throw
  await copyAgent(
    "target-agent",
    { market: "paper" },
    { apiUrl: "https://fomolt.test", apiKey: "k" },
    { once: true, initialCursor: "t5" }
  );

  // All 3 fetch calls happened (1 read + 2 mirror attempts)
  expect(mockFetch.mock.calls).toHaveLength(3);

  // Error was logged to stderr
  const stderrOutput = stderr.join("");
  expect(stderrOutput).toContain("MIRROR_ERROR");

  // Successful mirror still output to stdout
  const stdoutOutput = stdout.join("");
  expect(stdoutOutput).toContain("mirror");
});

test("first tick with empty trades emits lastSeenId null", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(apiResponse({ trades: [] }))
  );
  globalThis.fetch = mockFetch as any;
  const { copyAgent } = await import("../../src/commands/copy");
  await copyAgent(
    "empty-agent",
    { market: "paper" },
    { apiUrl: "https://fomolt.test", apiKey: "k" },
    { once: true }
  );

  expect(mockFetch.mock.calls).toHaveLength(1);
  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.event).toBe("started");
  expect(output.data.lastSeenId).toBeNull();
});

test("no new trades produces no output", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      apiResponse({
        trades: [
          { id: "t5", side: "buy", contractAddress: "0xabc", amountUsdc: "100" },
        ],
      })
    )
  );
  globalThis.fetch = mockFetch as any;
  const { copyAgent } = await import("../../src/commands/copy");
  await copyAgent(
    "target-agent",
    { market: "paper" },
    { apiUrl: "https://fomolt.test", apiKey: "k" },
    { once: true, initialCursor: "t5" }
  );

  // Only the read call, no mirror
  expect(mockFetch.mock.calls).toHaveLength(1);
  // No stdout output at all
  expect(stdout.join("")).toBe("");
});

test("--max-usdc does not cap when amount is under the limit", async () => {
  let callCount = 0;
  const mockFetch = mock(() => {
    callCount++;
    if (callCount === 1) {
      return Promise.resolve(
        apiResponse({
          trades: [
            { id: "t6", side: "buy", contractAddress: "0xabc", amountUsdc: "30" },
            { id: "t5", side: "buy", contractAddress: "0xold", amountUsdc: "10" },
          ],
        })
      );
    }
    return Promise.resolve(apiResponse({ tradeId: "my-t1" }));
  });
  globalThis.fetch = mockFetch as any;
  const { copyAgent } = await import("../../src/commands/copy");
  await copyAgent(
    "target-agent",
    { market: "paper", maxUsdc: "50" },
    { apiUrl: "https://fomolt.test", apiKey: "k" },
    { once: true, initialCursor: "t5" }
  );

  const mirrorBody = JSON.parse(mockFetch.mock.calls[1][1].body);
  // Should use the original amount, not the cap
  expect(mirrorBody.amountUsdc).toBe("30");
});

test("buy uses totalUsdc field as primary source", async () => {
  let callCount = 0;
  const mockFetch = mock(() => {
    callCount++;
    if (callCount === 1) {
      return Promise.resolve(
        apiResponse({
          trades: [
            { id: "t6", side: "buy", contractAddress: "0xabc", totalUsdc: "150" },
            { id: "t5", side: "buy", contractAddress: "0xold", totalUsdc: "10" },
          ],
        })
      );
    }
    return Promise.resolve(apiResponse({ tradeId: "my-t1" }));
  });
  globalThis.fetch = mockFetch as any;
  const { copyAgent } = await import("../../src/commands/copy");
  await copyAgent(
    "target-agent",
    { market: "paper" },
    { apiUrl: "https://fomolt.test", apiKey: "k" },
    { once: true, initialCursor: "t5" }
  );

  const mirrorBody = JSON.parse(mockFetch.mock.calls[1][1].body);
  expect(mirrorBody.amountUsdc).toBe("150");
});

test("buy uses amount field as fallback when amountUsdc is missing", async () => {
  let callCount = 0;
  const mockFetch = mock(() => {
    callCount++;
    if (callCount === 1) {
      return Promise.resolve(
        apiResponse({
          trades: [
            { id: "t6", side: "buy", contractAddress: "0xabc", amount: "75" },
            { id: "t5", side: "buy", contractAddress: "0xold", amountUsdc: "10" },
          ],
        })
      );
    }
    return Promise.resolve(apiResponse({ tradeId: "my-t1" }));
  });
  globalThis.fetch = mockFetch as any;
  const { copyAgent } = await import("../../src/commands/copy");
  await copyAgent(
    "target-agent",
    { market: "paper" },
    { apiUrl: "https://fomolt.test", apiKey: "k" },
    { once: true, initialCursor: "t5" }
  );

  const mirrorBody = JSON.parse(mockFetch.mock.calls[1][1].body);
  expect(mirrorBody.amountUsdc).toBe("75");
});

test("multiple new trades are mirrored oldest-first", async () => {
  let callCount = 0;
  const mirroredTokens: string[] = [];
  const mockFetch = mock(() => {
    callCount++;
    if (callCount === 1) {
      return Promise.resolve(
        apiResponse({
          trades: [
            { id: "t8", side: "buy", contractAddress: "0xnewest", amountUsdc: "300" },
            { id: "t7", side: "buy", contractAddress: "0xmiddle", amountUsdc: "200" },
            { id: "t6", side: "buy", contractAddress: "0xoldest_new", amountUsdc: "100" },
            { id: "t5", side: "buy", contractAddress: "0xseen", amountUsdc: "50" },
          ],
        })
      );
    }
    // Track the order of mirror calls
    const body = JSON.parse(arguments[0] === undefined ? "{}" : "{}");
    return Promise.resolve(apiResponse({ tradeId: `my-t${callCount}` }));
  });
  globalThis.fetch = mockFetch as any;
  const { copyAgent } = await import("../../src/commands/copy");
  await copyAgent(
    "target-agent",
    { market: "paper" },
    { apiUrl: "https://fomolt.test", apiKey: "k" },
    { once: true, initialCursor: "t5" }
  );

  // 1 read + 3 mirrors = 4 calls
  expect(mockFetch.mock.calls).toHaveLength(4);

  // Verify oldest-first order
  const firstMirror = JSON.parse(mockFetch.mock.calls[1][1].body);
  const secondMirror = JSON.parse(mockFetch.mock.calls[2][1].body);
  const thirdMirror = JSON.parse(mockFetch.mock.calls[3][1].body);
  expect(firstMirror.contractAddress).toBe("0xoldest_new");
  expect(secondMirror.contractAddress).toBe("0xmiddle");
  expect(thirdMirror.contractAddress).toBe("0xnewest");
});

test("reader uses no auth, trader uses auth header", async () => {
  let callCount = 0;
  const mockFetch = mock(() => {
    callCount++;
    if (callCount === 1) {
      return Promise.resolve(
        apiResponse({
          trades: [
            { id: "t6", side: "buy", contractAddress: "0xabc", amountUsdc: "100" },
            { id: "t5", side: "buy", contractAddress: "0xold", amountUsdc: "50" },
          ],
        })
      );
    }
    return Promise.resolve(apiResponse({ tradeId: "my-t1" }));
  });
  globalThis.fetch = mockFetch as any;
  const { copyAgent } = await import("../../src/commands/copy");
  await copyAgent(
    "target-agent",
    { market: "paper" },
    { apiUrl: "https://fomolt.test", apiKey: "test-key-123" },
    { once: true, initialCursor: "t5" }
  );

  // Reader call (first) should have no auth
  const readerHeaders = mockFetch.mock.calls[0][1].headers;
  expect(readerHeaders["Authorization"]).toBeUndefined();

  // Trader call (second) should have auth
  const traderHeaders = mockFetch.mock.calls[1][1].headers;
  expect(traderHeaders["Authorization"]).toBe("Bearer test-key-123");
});

test("cursor is passed when fetching target trades", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      apiResponse({
        trades: [
          { id: "t5", side: "buy", contractAddress: "0xabc", amountUsdc: "100" },
        ],
      })
    )
  );
  globalThis.fetch = mockFetch as any;
  const { copyAgent } = await import("../../src/commands/copy");
  await copyAgent(
    "target-agent",
    { market: "paper" },
    { apiUrl: "https://fomolt.test", apiKey: "k" },
    { once: true, initialCursor: "t4" }
  );

  const url: string = mockFetch.mock.calls[0][0];
  expect(url).toContain("cursor=t4");
});

test("copy encodes special characters in agent name", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      apiResponse({
        trades: [
          { id: "t5", side: "buy", contractAddress: "0xabc", amountUsdc: "100" },
        ],
      })
    )
  );
  globalThis.fetch = mockFetch as any;
  const { copyAgent } = await import("../../src/commands/copy");
  await copyAgent(
    "agent/special name",
    { market: "paper" },
    { apiUrl: "https://fomolt.test", apiKey: "k" },
    { once: true }
  );

  const url: string = mockFetch.mock.calls[0][0];
  expect(url).toContain("/agent/agent%2Fspecial%20name/trades");
});

test("live market uses live trade endpoint", async () => {
  let callCount = 0;
  const mockFetch = mock(() => {
    callCount++;
    if (callCount === 1) {
      return Promise.resolve(
        apiResponse({
          trades: [
            { id: "t6", side: "buy", contractAddress: "0xabc", amountUsdc: "100" },
            { id: "t5", side: "buy", contractAddress: "0xold", amountUsdc: "50" },
          ],
        })
      );
    }
    return Promise.resolve(apiResponse({ tradeId: "my-t1" }));
  });
  globalThis.fetch = mockFetch as any;
  const { copyAgent } = await import("../../src/commands/copy");
  await copyAgent(
    "target-agent",
    { market: "live" },
    { apiUrl: "https://fomolt.test", apiKey: "k" },
    { once: true, initialCursor: "t5" }
  );

  const mirrorCall = mockFetch.mock.calls[1];
  expect(mirrorCall[0]).toContain("/agent/live/dex/trade");
});
