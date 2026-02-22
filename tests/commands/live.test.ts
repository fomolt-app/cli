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

test("live tokens returns list", async () => {
  mockApiResponse({
    mode: "trending",
    tokens: [{ symbol: "BRETT" }],
    count: 1,
  });

  const { handleLiveTokens } = await import("../../src/commands/live");
  await handleLiveTokens({}, { apiUrl: "https://fomolt.test", apiKey: "k" });

  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.tokens[0].symbol).toBe("BRETT");
});

test("live balance returns balances", async () => {
  mockApiResponse({
    smartAccountAddress: "0xabc",
    usdcBalance: "450",
    ethBalance: "0.002",
  });

  const { handleLiveBalance } = await import("../../src/commands/live");
  await handleLiveBalance({ apiUrl: "https://fomolt.test", apiKey: "k" });

  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.usdcBalance).toBe("450");
});

test("live quote buy sends amountUsdc and slippage", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          response: {
            contractAddress: "0x68e4",
            symbol: "CASHU",
            side: "buy",
            quantity: "4051.879951",
            price: "0.01234",
            totalUsdc: "100",
            slippage: "2",
          },
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

  const { handleLiveQuote } = await import("../../src/commands/live");
  await handleLiveQuote(
    { side: "buy", token: "0x68e4", usdc: "100", slippage: "2" },
    { apiUrl: "https://fomolt.test", apiKey: "k" }
  );

  const body = JSON.parse(mockFetch.mock.calls[0][1].body);
  expect(body.amountUsdc).toBe("100");
  expect(body.slippage).toBe("2");
  expect(body.quantity).toBeUndefined();
});

test("live trade buy sends amountUsdc", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          response: {
            trade: { id: "t1", side: "buy", status: "confirmed" },
          },
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

  const { handleLiveTrade } = await import("../../src/commands/live");
  await handleLiveTrade(
    { side: "buy", token: "0x68e4", usdc: "100" },
    { apiUrl: "https://fomolt.test", apiKey: "k" }
  );

  const body = JSON.parse(mockFetch.mock.calls[0][1].body);
  expect(body.amountUsdc).toBe("100");
  expect(body.quantity).toBeUndefined();
});

test("live price sends contractAddress param", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          response: {
            contractAddress: "0x68e4",
            symbol: "CASHU",
            price: "0.01234",
          },
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

  const { handleLivePrice } = await import("../../src/commands/live");
  await handleLivePrice(
    { token: "0x68e4" },
    { apiUrl: "https://fomolt.test", apiKey: "k" }
  );

  const url = new URL(mockFetch.mock.calls[0][0]);
  expect(url.pathname).toContain("/agent/live/base/price");
  expect(url.searchParams.get("contractAddress")).toBe("0x68e4");

  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.price).toBe("0.01234");
});

test("live withdraw maps currency to asset in API body", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          response: {
            txHash: "0xdef",
            asset: "USDC",
            amount: "50",
            remainingBalance: "300",
          },
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

  const { handleLiveWithdraw } = await import("../../src/commands/live");
  await handleLiveWithdraw(
    { currency: "USDC", amount: "50", to: "0xwallet" },
    { apiUrl: "https://fomolt.test", apiKey: "k" }
  );

  const body = JSON.parse(mockFetch.mock.calls[0][1].body);
  expect(body.asset).toBe("USDC");
  expect(body.currency).toBeUndefined();

  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.txHash).toBe("0xdef");
});
