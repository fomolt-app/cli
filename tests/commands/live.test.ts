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

  test("live tokens sends filter params for base", async () => {
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

  test("live tokens sends filter params for solana", async () => {
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
    expect(url.searchParams.get("min_liquidity")).toBe("1000");
    expect(url.searchParams.get("min_volume_1h_usd")).toBe("500");
    expect(url.searchParams.get("min_holder")).toBe("10");
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

  test("live token-info uses dedicated solana token-info endpoint", async () => {
    mockApiResponse({
      mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      name: "Test Token",
      symbol: "TEST",
      decimals: 9,
      priceUsd: "0.05",
      marketCapUsd: "500000",
      holderCount: 1234,
      mintAuthority: null,
      freezeAuthority: null,
      securityFlags: [],
    });

    const { handleLiveTokenInfo } = await import("../../src/commands/live");
    await handleLiveTokenInfo(
      { address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", chain: "solana" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/solana/token-info");
    expect(url.searchParams.get("address")).toBe("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

    const output = JSON.parse(stdout.join(""));
    expect(output.ok).toBe(true);
    expect(output.data.symbol).toBe("TEST");
    expect(output.data.holderCount).toBe(1234);
    expect(output.data.mintAuthority).toBeNull();
  });

  test("live tokens sends new filter params for solana", async () => {
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
      { chain: "solana", minMarketCap: "10000", maxMarketCap: "1000000", minAge: "5", maxAge: "60", sort: "volume", order: "asc" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.searchParams.get("min_market_cap")).toBe("10000");
    expect(url.searchParams.get("max_market_cap")).toBe("1000000");
    expect(url.searchParams.get("min_age")).toBe("5");
    expect(url.searchParams.get("max_age")).toBe("60");
    expect(url.searchParams.get("sort")).toBe("volume");
    expect(url.searchParams.get("order")).toBe("asc");
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
    requireBase("base", "withdraw");
  });

  test("requireBase rejects solana for withdraw", async () => {
    const { requireBase } = await import("../../src/commands/live");
    try {
      requireBase("solana", "withdraw");
      throw new Error("expected exit");
    } catch (e: any) {
      expect(e.message).toBe("EXIT");
    }
    expect(exitCode).toBe(1);
    const out = JSON.parse(stderr.join(""));
    expect(out.error).toContain("withdraw");
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

// --- hintCLI injection ---

describe("hintCLI injection", () => {
  test("live trade injects hintCLI", async () => {
    mockApiResponse({ trade: { id: "t1", side: "buy", status: "confirmed" } });

    const { handleLiveTrade } = await import("../../src/commands/live");
    await handleLiveTrade(
      { side: "buy", token: "0x68e4", chain: "base", usdc: "100" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const output = JSON.parse(stdout.join(""));
    expect(output.data.hintCLI).toBe("Check portfolio: fomolt live portfolio --chain base");
  });

  test("live quote injects hintCLI", async () => {
    mockApiResponse({ side: "buy", quantity: "1000", totalUsdc: "50" });

    const { handleLiveQuote } = await import("../../src/commands/live");
    await handleLiveQuote(
      { side: "buy", token: "0x68e4", chain: "base", usdc: "50" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const output = JSON.parse(stdout.join(""));
    expect(output.data.hintCLI).toBe("Execute: fomolt live trade --chain base --side buy --token 0x68e4 --usdc 50");
  });

  test("live withdraw injects hintCLI", async () => {
    mockApiResponse({ txHash: "0xabc", amount: "50" });

    const { handleLiveWithdraw } = await import("../../src/commands/live");
    await handleLiveWithdraw(
      { chain: "base", currency: "USDC", amount: "50", to: "0xwallet" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const output = JSON.parse(stdout.join(""));
    expect(output.data.hintCLI).toBe("Check balance: fomolt live balance --chain base");
  });

  test("live tokens injects hintCLI when results non-empty", async () => {
    mockApiResponse({ tokens: [{ contractAddress: "0xabc", symbol: "TEST" }], count: 1 });

    const { handleLiveTokens } = await import("../../src/commands/live");
    await handleLiveTokens(
      { chain: "base" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const output = JSON.parse(stdout.join(""));
    expect(output.data.hintCLI).toBe("Get details: fomolt token info --chain base --token 0xabc");
  });

  test("live tokens hint uses custom tokenInfoCmd when provided", async () => {
    mockApiResponse({ tokens: [{ contractAddress: "0xabc", symbol: "TEST" }], count: 1 });

    const { handleLiveTokens } = await import("../../src/commands/live");
    await handleLiveTokens(
      { chain: "base" },
      { apiUrl: "https://fomolt.test", apiKey: "k" },
      { tokenInfoCmd: "fomolt custom-cmd" }
    );

    const output = JSON.parse(stdout.join(""));
    expect(output.data.hintCLI).toBe("Get details: fomolt custom-cmd --chain base --token 0xabc");
  });

  test("live tokens no hintCLI when results empty", async () => {
    mockApiResponse({ tokens: [], count: 0 });

    const { handleLiveTokens } = await import("../../src/commands/live");
    await handleLiveTokens(
      { chain: "base" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const output = JSON.parse(stdout.join(""));
    expect(output.data.hintCLI).toBeUndefined();
  });

  test("live token-info injects hintCLI", async () => {
    mockApiResponse({ symbol: "TEST", priceUsd: "0.05" });

    const { handleLiveTokenInfo } = await import("../../src/commands/live");
    await handleLiveTokenInfo(
      { address: "0x68e4", chain: "base" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const output = JSON.parse(stdout.join(""));
    expect(output.data.hintCLI).toBe("Get a quote: fomolt live quote --chain base --side buy --token 0x68e4 --usdc 10");
  });

  test("API-provided hintCLI is not overridden", async () => {
    mockApiResponse({ trade: { id: "t1" }, hintCLI: "API says this" });

    const { handleLiveTrade } = await import("../../src/commands/live");
    await handleLiveTrade(
      { side: "buy", token: "0x68e4", chain: "base", usdc: "100" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const output = JSON.parse(stdout.join(""));
    expect(output.data.hintCLI).toBe("API says this");
  });

  test("live bridge quote injects hintCLI", async () => {
    mockApiResponse({ estimatedOutput: "1.5" });

    const { handleLiveBridgeQuote } = await import("../../src/commands/live");
    await handleLiveBridgeQuote(
      { direction: "base_to_solana", amount: "50" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const output = JSON.parse(stdout.join(""));
    expect(output.data.hintCLI).toBe("Execute: fomolt live bridge execute --direction base_to_solana --amount 50");
  });

  test("live bridge execute injects hintCLI", async () => {
    mockApiResponse({ txHash: "0xdef" });

    const { handleLiveBridge } = await import("../../src/commands/live");
    await handleLiveBridge(
      { direction: "base_to_solana", amount: "50" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const output = JSON.parse(stdout.join(""));
    expect(output.data.hintCLI).toBe("Check balances: fomolt live balance --chain base && fomolt live balance --chain solana");
  });
});

// --- Error codes ---

describe("specific error codes", () => {
  test("requireBase uses INVALID_CHAIN", async () => {
    const { requireBase } = await import("../../src/commands/live");
    try {
      requireBase("solana", "withdraw");
      throw new Error("expected exit");
    } catch (e: any) {
      expect(e.message).toBe("EXIT");
    }
    const out = JSON.parse(stderr.join(""));
    expect(out.code).toBe("INVALID_CHAIN");
  });
});

// --- Validators ---

describe("validateSort and validateOrder", () => {
  test("validateSort accepts valid sort values", async () => {
    const { validateSort } = await import("../../src/validate");
    expect(validateSort("trending")).toBe("trending");
    expect(validateSort("volume")).toBe("volume");
    expect(validateSort("market_cap")).toBe("market_cap");
    expect(validateSort("holders")).toBe("holders");
    expect(validateSort("created")).toBe("created");
  });

  test("validateSort rejects invalid sort value", async () => {
    const { validateSort } = await import("../../src/validate");
    try {
      validateSort("invalid");
      throw new Error("expected exit");
    } catch (e: any) {
      expect(e.message).toBe("EXIT");
    }
    expect(exitCode).toBe(1);
    const out = JSON.parse(stderr.join(""));
    expect(out.error).toContain("--sort");
    expect(out.code).toBe("INVALID_SORT");
  });

  test("validateOrder accepts asc and desc", async () => {
    const { validateOrder } = await import("../../src/validate");
    expect(validateOrder("asc")).toBe("asc");
    expect(validateOrder("desc")).toBe("desc");
  });

  test("validateOrder rejects invalid order value", async () => {
    const { validateOrder } = await import("../../src/validate");
    try {
      validateOrder("up");
      throw new Error("expected exit");
    } catch (e: any) {
      expect(e.message).toBe("EXIT");
    }
    expect(exitCode).toBe(1);
    const out = JSON.parse(stderr.join(""));
    expect(out.error).toContain("--order");
    expect(out.code).toBe("INVALID_ORDER");
  });
});

