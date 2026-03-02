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

describe("token search", () => {
  test("token search hits /agent/live/{chain}/tokens", async () => {
    mockApiResponse({ tokens: [{ contractAddress: "0xabc", symbol: "TEST" }], count: 1 });

    const { handleLiveTokens } = await import("../../src/commands/live");
    await handleLiveTokens(
      { chain: "base" },
      { apiUrl: "https://fomolt.test", apiKey: "k" },
      { tokenInfoCmd: "fomolt token info" }
    );

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/base/tokens");

    const output = JSON.parse(stdout.join(""));
    expect(output.ok).toBe(true);
    expect(output.data.tokens[0].symbol).toBe("TEST");
  });

  test("token search hint references fomolt token info", async () => {
    mockApiResponse({ tokens: [{ contractAddress: "0xabc", symbol: "TEST" }], count: 1 });

    const { handleLiveTokens } = await import("../../src/commands/live");
    await handleLiveTokens(
      { chain: "base" },
      { apiUrl: "https://fomolt.test", apiKey: "k" },
      { tokenInfoCmd: "fomolt token info" }
    );

    const output = JSON.parse(stdout.join(""));
    expect(output.data.hintCLI).toBe("Get details: fomolt token info --chain base --token 0xabc");
  });

  test("token search with solana uses solana endpoint", async () => {
    mockApiResponse({ tokens: [{ mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", symbol: "TEST" }], count: 1 });

    const { handleLiveTokens } = await import("../../src/commands/live");
    await handleLiveTokens(
      { chain: "solana" },
      { apiUrl: "https://fomolt.test", apiKey: "k" },
      { tokenInfoCmd: "fomolt token info" }
    );

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/solana/tokens");

    const output = JSON.parse(stdout.join(""));
    expect(output.data.hintCLI).toContain("fomolt token info");
  });
});

describe("token info", () => {
  test("token info hits /agent/live/dex/token-info for base", async () => {
    mockApiResponse({ symbol: "TEST", priceUsd: "0.05" });

    const { handleLiveTokenInfo } = await import("../../src/commands/live");
    await handleLiveTokenInfo(
      { address: "0x68e4", chain: "base" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/dex/token-info");

    const output = JSON.parse(stdout.join(""));
    expect(output.ok).toBe(true);
  });

  test("token info hits /agent/live/solana/token-info for solana", async () => {
    mockApiResponse({ symbol: "TEST", priceUsd: "0.05" });

    const { handleLiveTokenInfo } = await import("../../src/commands/live");
    await handleLiveTokenInfo(
      { address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", chain: "solana" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/solana/token-info");
  });
});

describe("token price", () => {
  test("token price --market live dispatches to live endpoint", async () => {
    mockApiResponse({ price: "0.01234" });

    const { handleLivePrice } = await import("../../src/commands/live");
    await handleLivePrice(
      { token: "0x68e4", chain: "base" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/base/price");
  });

  test("token price --market paper dispatches to paper endpoint", async () => {
    mockApiResponse({ priceInUsdc: "0.01234" });

    const { handlePaperPrice } = await import("../../src/commands/paper");
    await handlePaperPrice(
      { token: "0x68e4", chain: "base" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/paper/base/price");
  });

  test("token price solana --market live uses mintAddress", async () => {
    mockApiResponse({ price: "0.005" });

    const { handleLivePrice } = await import("../../src/commands/live");
    await handleLivePrice(
      { token: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", chain: "solana" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/solana/price");
    expect(url.searchParams.get("mintAddress")).toBe("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  });
});

describe("token holders", () => {
  test("token holders hits /agent/live/dex/holders", async () => {
    mockApiResponse({ holders: [{ address: "0xabc", balance: "1000" }] });

    const { handleLiveHolders } = await import("../../src/commands/live");
    await handleLiveHolders(
      { address: "0x68e4", chain: "base", limit: "25" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/dex/holders");
    expect(url.searchParams.get("address")).toBe("0x68e4");
    expect(url.searchParams.get("chain")).toBe("base");
  });
});

describe("token trades", () => {
  test("token trades hits /agent/live/dex/token-trades", async () => {
    mockApiResponse({ trades: [{ txHash: "0xdef" }] });

    const { handleLiveTokenTrades } = await import("../../src/commands/live");
    await handleLiveTokenTrades(
      { address: "0x68e4", chain: "base", limit: "25" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/dex/token-trades");
    expect(url.searchParams.get("address")).toBe("0x68e4");
  });
});

describe("token wallets", () => {
  test("token wallets hits /agent/live/dex/token-wallets", async () => {
    mockApiResponse({ wallets: [{ address: "0xabc", pnl: "500" }] });

    const { handleLiveTokenWallets } = await import("../../src/commands/live");
    await handleLiveTokenWallets(
      { address: "0x68e4", chain: "base", sort: "pnl", period: "30d", limit: "20", offset: "0" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/dex/token-wallets");
    expect(url.searchParams.get("address")).toBe("0x68e4");
    expect(url.searchParams.get("sort")).toBe("pnl");
    expect(url.searchParams.get("period")).toBe("30d");
  });
});
