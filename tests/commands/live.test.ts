import { test, expect, beforeEach, afterEach, mock, describe } from "bun:test";

let stdout: string[] = [];
let stderr: string[] = [];
let exitCode: number | undefined;
const originalWrite = process.stdout.write;
const originalStderrWrite = process.stderr.write;
const originalExit = process.exit;
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
  stderr = [];
  exitCode = undefined;
  process.stdout.write = ((chunk: string) => {
    stdout.push(chunk);
    return true;
  }) as any;
  process.stderr.write = ((chunk: string) => {
    stderr.push(chunk);
    return true;
  }) as any;
  process.exit = ((code?: number) => {
    exitCode = code;
    throw new Error("EXIT");
  }) as never;
});

afterEach(() => {
  process.stdout.write = originalWrite;
  process.stderr.write = originalStderrWrite;
  process.exit = originalExit;
  globalThis.fetch = originalFetch;
});

// --- Base ---

describe("live Base", () => {
  test("live tokens returns list (base)", async () => {
    mockApiResponse({
      mode: "trending",
      tokens: [{ symbol: "BRETT" }],
      count: 1,
    });

    const { handleLiveTokens } = await import("../../src/commands/live");
    await handleLiveTokens({ chain: "base" }, { apiUrl: "https://fomolt.test", apiKey: "k" });

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/base/tokens");

    const output = JSON.parse(stdout.join(""));
    expect(output.ok).toBe(true);
    expect(output.data.tokens[0].symbol).toBe("BRETT");
  });

  test("live balance returns balances (base)", async () => {
    mockApiResponse({
      smartAccountAddress: "0xabc",
      usdcBalance: "450",
      ethBalance: "0.002",
    });

    const { handleLiveBalance } = await import("../../src/commands/live");
    await handleLiveBalance({ chain: "base" }, { apiUrl: "https://fomolt.test", apiKey: "k" });

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/base/balance");

    const output = JSON.parse(stdout.join(""));
    expect(output.ok).toBe(true);
    expect(output.data.usdcBalance).toBe("450");
  });

  test("live quote buy sends amountUsdc and slippage (base)", async () => {
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
      { side: "buy", token: "0x68e4", chain: "base", usdc: "100", slippage: "2" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.amountUsdc).toBe("100");
    expect(body.contractAddress).toBe("0x68e4");
    expect(body.slippage).toBe("2");
    expect(body.quantity).toBeUndefined();

    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/base/quote");
  });

  test("live trade buy sends amountUsdc (base)", async () => {
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
      { side: "buy", token: "0x68e4", chain: "base", usdc: "100" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.amountUsdc).toBe("100");
    expect(body.contractAddress).toBe("0x68e4");
    expect(body.quantity).toBeUndefined();

    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/base/trade");
  });

  test("live price sends contractAddress param (base)", async () => {
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
      { token: "0x68e4", chain: "base" },
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
      { chain: "base", currency: "USDC", amount: "50", to: "0xwallet" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.asset).toBe("USDC");
    expect(body.currency).toBeUndefined();

    const output = JSON.parse(stdout.join(""));
    expect(output.ok).toBe(true);
    expect(output.data.txHash).toBe("0xdef");
  });

  test("live tokens sends filter params only for base", async () => {
    const mockFetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ success: true, response: { tokens: [], count: 0 } }),
          { status: 200, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
        )
      )
    );
    globalThis.fetch = mockFetch as any;

    const { handleLiveTokens } = await import("../../src/commands/live");
    await handleLiveTokens(
      { chain: "base", minLiquidity: "1000", minVolume1h: "500", minHolders: "10" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.searchParams.get("min_liquidity")).toBe("1000");
    expect(url.searchParams.get("min_volume_1h_usd")).toBe("500");
    expect(url.searchParams.get("min_holder")).toBe("10");
  });
});

// --- Solana ---

describe("live Solana", () => {
  test("live tokens uses solana endpoint", async () => {
    mockApiResponse({ tokens: [{ symbol: "PUMP" }], count: 1 });

    const { handleLiveTokens } = await import("../../src/commands/live");
    await handleLiveTokens({ chain: "solana" }, { apiUrl: "https://fomolt.test", apiKey: "k" });

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/solana/tokens");
  });

  test("live tokens omits filter params for solana", async () => {
    const mockFetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ success: true, response: { tokens: [], count: 0 } }),
          { status: 200, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
        )
      )
    );
    globalThis.fetch = mockFetch as any;

    const { handleLiveTokens } = await import("../../src/commands/live");
    await handleLiveTokens(
      { chain: "solana", minLiquidity: "1000", minVolume1h: "500", minHolders: "10" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.searchParams.get("min_liquidity")).toBeNull();
    expect(url.searchParams.get("min_volume_1h_usd")).toBeNull();
    expect(url.searchParams.get("min_holder")).toBeNull();
  });

  test("live balance routes to solana portfolio", async () => {
    mockApiResponse({ solBalance: "10.5", positions: [] });

    const { handleLiveBalance } = await import("../../src/commands/live");
    await handleLiveBalance({ chain: "solana" }, { apiUrl: "https://fomolt.test", apiKey: "k" });

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/solana/portfolio");
  });

  test("live deposit routes to solana deposit", async () => {
    mockApiResponse({ walletAddress: "ABC123" });

    const { handleLiveDeposit } = await import("../../src/commands/live");
    await handleLiveDeposit({ chain: "solana" }, { apiUrl: "https://fomolt.test", apiKey: "k" });

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/solana/deposit");
  });

  test("live quote buy sends amountSol with mintAddress (solana)", async () => {
    const mockFetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            response: {
              mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
              side: "buy",
              quantity: "100000",
              totalSol: "1",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
        )
      )
    );
    globalThis.fetch = mockFetch as any;

    const { handleLiveQuote } = await import("../../src/commands/live");
    await handleLiveQuote(
      { side: "buy", token: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", chain: "solana", sol: "1" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.amountSol).toBe("1");
    expect(body.mintAddress).toBe("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
    expect(body.amountUsdc).toBeUndefined();
    expect(body.contractAddress).toBeUndefined();

    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/solana/quote");
  });

  test("live trade buy sends amountSol with mintAddress (solana)", async () => {
    const mockFetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            response: { trade: { id: "t2", side: "buy", status: "confirmed" } },
          }),
          { status: 200, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
        )
      )
    );
    globalThis.fetch = mockFetch as any;

    const { handleLiveTrade } = await import("../../src/commands/live");
    await handleLiveTrade(
      { side: "buy", token: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", chain: "solana", sol: "2" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.amountSol).toBe("2");
    expect(body.mintAddress).toBe("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/solana/trade");
  });

  test("live portfolio uses solana endpoint", async () => {
    mockApiResponse({ solBalance: "10", positions: [] });

    const { handleLivePortfolio } = await import("../../src/commands/live");
    await handleLivePortfolio({ chain: "solana" }, { apiUrl: "https://fomolt.test", apiKey: "k" });

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/solana/portfolio");
  });

  test("live trades uses solana endpoint", async () => {
    mockApiResponse({ trades: [], count: 0 });

    const { handleLiveTrades } = await import("../../src/commands/live");
    await handleLiveTrades(
      { chain: "solana", mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/solana/trades");
    expect(url.searchParams.get("mintAddress")).toBe("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  });

  test("live performance uses solana endpoint", async () => {
    mockApiResponse({ totalPnl: "1.2" });

    const { handleLivePerformance } = await import("../../src/commands/live");
    await handleLivePerformance({ chain: "solana" }, { apiUrl: "https://fomolt.test", apiKey: "k" });

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/solana/performance");
  });

  test("live price uses solana endpoint with mintAddress", async () => {
    const mockFetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            response: { mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", price: "0.005" },
          }),
          { status: 200, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
        )
      )
    );
    globalThis.fetch = mockFetch as any;

    const { handleLivePrice } = await import("../../src/commands/live");
    await handleLivePrice(
      { token: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", chain: "solana" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/solana/price");
    expect(url.searchParams.get("mintAddress")).toBe("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  });

  test("live withdraw routes to solana endpoint", async () => {
    const mockFetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            response: {
              txSignature: "5abc123def",
              asset: "SOL",
              amount: "1.5",
              to: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
              remainingBalance: "3.5",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
        )
      )
    );
    globalThis.fetch = mockFetch as any;

    const { handleLiveWithdraw } = await import("../../src/commands/live");
    await handleLiveWithdraw(
      { chain: "solana", currency: "SOL", amount: "1.5", to: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/solana/withdraw");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.asset).toBe("SOL");
    expect(body.amount).toBe("1.5");
    expect(body.to).toBe("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

    const output = JSON.parse(stdout.join(""));
    expect(output.ok).toBe(true);
    expect(output.data.txSignature).toBe("5abc123def");
  });
});

// --- Base-only command errors ---

describe("Base-only commands error on Solana", () => {
  test("requireBase passes for base", async () => {
    const { requireBase } = await import("../../src/commands/live");
    // Should not throw
    requireBase("base", "session-key");
  });

  test("requireBase rejects solana for session-key", async () => {
    const { requireBase } = await import("../../src/commands/live");
    try {
      requireBase("solana", "session-key");
      throw new Error("expected exit");
    } catch (e: any) {
      expect(e.message).toBe("EXIT");
    }
    expect(exitCode).toBe(1);
    const out = JSON.parse(stderr.join(""));
    expect(out.error).toContain("session-key");
  });

  test("requireBase rejects solana for token-info", async () => {
    const { requireBase } = await import("../../src/commands/live");
    try {
      requireBase("solana", "token-info");
      throw new Error("expected exit");
    } catch (e: any) {
      expect(e.message).toBe("EXIT");
    }
    expect(exitCode).toBe(1);
    const out = JSON.parse(stderr.join(""));
    expect(out.error).toContain("token-info");
  });

  test("withdraw still works for base", async () => {
    mockApiResponse({ txHash: "0xabc" });
    const { handleLiveWithdraw } = await import("../../src/commands/live");
    await handleLiveWithdraw(
      { chain: "base", currency: "ETH", amount: "0.01", to: "0xwallet" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );
    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/base/withdraw");
    const output = JSON.parse(stdout.join(""));
    expect(output.ok).toBe(true);
  });
});
