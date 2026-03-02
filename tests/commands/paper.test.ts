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

describe("paper Base", () => {
  test("paper price fetches token price (base)", async () => {
    mockApiResponse({
      token: { name: "Cashu", symbol: "CASHU", contractAddress: "0x68e4" },
      priceInUsdc: "0.01234",
    });

    const { handlePaperPrice } = await import("../../src/commands/paper");
    await handlePaperPrice(
      { token: "0x68e4", chain: "base" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const output = JSON.parse(stdout.join(""));
    expect(output.ok).toBe(true);
    expect(output.data.priceInUsdc).toBe("0.01234");

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/paper/base/price");
    expect(url.searchParams.get("contractAddress")).toBe("0x68e4");
  });

  test("paper trade buy sends amountUsdc (base)", async () => {
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
      { side: "buy", token: "0x68e4", chain: "base", usdc: "500" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.amountUsdc).toBe("500");
    expect(body.contractAddress).toBe("0x68e4");
    expect(body.quantity).toBeUndefined();
  });

  test("paper trade sell sends quantity (base)", async () => {
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
      { side: "sell", token: "0x68e4", chain: "base", quantity: "10000" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.quantity).toBe("10000");
    expect(body.amountUsdc).toBeUndefined();
  });

  test("paper portfolio returns positions (base)", async () => {
    mockApiResponse({ usdcBalance: "9500", positions: [] });

    const { handlePaperPortfolio } = await import("../../src/commands/paper");
    await handlePaperPortfolio({ chain: "base" }, { apiUrl: "https://fomolt.test", apiKey: "k" });

    const output = JSON.parse(stdout.join(""));
    expect(output.ok).toBe(true);
    expect(output.data.usdcBalance).toBe("9500");

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/paper/base/portfolio");
  });
});

// --- Solana ---

describe("paper Solana", () => {
  test("paper price fetches token price (solana)", async () => {
    mockApiResponse({
      token: { name: "TestToken", symbol: "TEST", mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
      priceInSol: "0.005",
    });

    const { handlePaperPrice } = await import("../../src/commands/paper");
    await handlePaperPrice(
      { token: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", chain: "solana" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/paper/solana/price");
    expect(url.searchParams.get("mintAddress")).toBe("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

    const output = JSON.parse(stdout.join(""));
    expect(output.ok).toBe(true);
    expect(output.data.priceInSol).toBe("0.005");
  });

  test("paper trade buy sends amountSol (solana)", async () => {
    const mockFetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            response: { trade: { side: "buy", totalSol: "1" } },
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
      { side: "buy", token: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", chain: "solana", sol: "1" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.amountSol).toBe("1");
    expect(body.mintAddress).toBe("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
    expect(body.amountUsdc).toBeUndefined();
    expect(body.contractAddress).toBeUndefined();

    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/paper/solana/trade");
  });

  test("paper trade sell sends percent (solana)", async () => {
    const mockFetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            success: true,
            response: { trade: { side: "sell", totalSol: "0.5" } },
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
      { side: "sell", token: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", chain: "solana", percent: "50" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.percent).toBe(50);
    expect(body.mintAddress).toBe("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
    expect(body.amountSol).toBeUndefined();
  });

  test("paper portfolio uses solana endpoint", async () => {
    mockApiResponse({ solBalance: "48.5", positions: [] });

    const { handlePaperPortfolio } = await import("../../src/commands/paper");
    await handlePaperPortfolio({ chain: "solana" }, { apiUrl: "https://fomolt.test", apiKey: "k" });

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/paper/solana/portfolio");

    const output = JSON.parse(stdout.join(""));
    expect(output.ok).toBe(true);
    expect(output.data.solBalance).toBe("48.5");
  });

  test("paper performance uses solana endpoint", async () => {
    mockApiResponse({ totalPnl: "2.5" });

    const { handlePaperPerformance } = await import("../../src/commands/paper");
    await handlePaperPerformance({ chain: "solana" }, { apiUrl: "https://fomolt.test", apiKey: "k" });

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/paper/solana/performance");
  });

  test("paper trades uses solana endpoint with mintAddress", async () => {
    mockApiResponse({ trades: [], count: 0 });

    const { handlePaperTrades } = await import("../../src/commands/paper");
    await handlePaperTrades(
      { chain: "solana", mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/paper/solana/trades");
    expect(url.searchParams.get("mintAddress")).toBe("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  });
});

// --- hintCLI ---

describe("hintCLI injection", () => {
  test("paper trade injects hintCLI", async () => {
    mockApiResponse({ trade: { side: "buy", totalUsdc: "500" } });

    const { handlePaperTrade } = await import("../../src/commands/paper");
    await handlePaperTrade(
      { side: "buy", token: "0x68e4", chain: "base", usdc: "500" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const output = JSON.parse(stdout.join(""));
    expect(output.data.hintCLI).toBe("Check portfolio: fomolt paper portfolio --chain base");
  });

  test("paper trade solana hint uses solana chain", async () => {
    mockApiResponse({ trade: { side: "buy", totalSol: "1" } });

    const { handlePaperTrade } = await import("../../src/commands/paper");
    await handlePaperTrade(
      { side: "buy", token: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", chain: "solana", sol: "1" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const output = JSON.parse(stdout.join(""));
    expect(output.data.hintCLI).toBe("Check portfolio: fomolt paper portfolio --chain solana");
  });
});

// --- pnl-image Base-only ---

describe("paper pnl-image", () => {
  test("pnl-image works for base", async () => {
    mockApiResponse({ imageUrl: "https://example.com/pnl.png" });

    const { handlePaperPnlImage } = await import("../../src/commands/paper");
    await handlePaperPnlImage(
      { token: "0x4200000000000000000000000000000000000006" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/paper/base/pnl-image");

    const output = JSON.parse(stdout.join(""));
    expect(output.ok).toBe(true);
  });
});
