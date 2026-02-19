import { test, expect, beforeEach, afterEach, mock } from "bun:test";

let stdout: string[] = [];
const originalWrite = process.stdout.write;
const originalFetch = globalThis.fetch;

function mockApiResponse(response: any) {
  globalThis.fetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({ success: true, response }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": "r1",
          },
        }
      )
    )
  ) as any;
}

beforeEach(() => {
  stdout = [];
  process.stdout.write = ((chunk: string) => {
    stdout.push(chunk);
    return true;
  }) as any;
});

afterEach(() => {
  process.stdout.write = originalWrite;
  globalThis.fetch = originalFetch;
});

test("paper price fetches token price", async () => {
  mockApiResponse({
    token: { name: "Cashu", symbol: "CASHU", contractAddress: "0x68e4" },
    priceInUsdc: "0.01234",
  });

  const { handlePaperPrice } = await import("../../src/commands/paper");
  await handlePaperPrice(
    { token: "0x68e4" },
    { apiUrl: "https://fomolt.test", apiKey: "k" }
  );

  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.priceInUsdc).toBe("0.01234");
});

test("paper trade buy sends amountUsdc", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          response: { trade: { side: "buy", totalUsdc: "500" } },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": "r1",
          },
        }
      )
    )
  );
  globalThis.fetch = mockFetch as any;

  const { handlePaperTrade } = await import("../../src/commands/paper");
  await handlePaperTrade(
    { side: "buy", token: "0x68e4", usdc: "500" },
    { apiUrl: "https://fomolt.test", apiKey: "k" }
  );

  const body = JSON.parse(mockFetch.mock.calls[0][1].body);
  expect(body.amountUsdc).toBe("500");
  expect(body.quantity).toBeUndefined();
});

test("paper trade sell sends quantity", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          response: { trade: { side: "sell", totalUsdc: "100" } },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": "r1",
          },
        }
      )
    )
  );
  globalThis.fetch = mockFetch as any;

  const { handlePaperTrade } = await import("../../src/commands/paper");
  await handlePaperTrade(
    { side: "sell", token: "0x68e4", quantity: "10000" },
    { apiUrl: "https://fomolt.test", apiKey: "k" }
  );

  const body = JSON.parse(mockFetch.mock.calls[0][1].body);
  expect(body.quantity).toBe("10000");
  expect(body.amountUsdc).toBeUndefined();
});

test("paper portfolio returns positions", async () => {
  mockApiResponse({ usdcBalance: "9500", positions: [] });

  const { handlePaperPortfolio } = await import("../../src/commands/paper");
  await handlePaperPortfolio({ apiUrl: "https://fomolt.test", apiKey: "k" });

  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.usdcBalance).toBe("9500");
});
