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

describe("wallet", () => {
  test("wallet hits /agent/live/dex/wallet with params", async () => {
    mockApiResponse({ pnl: "1000", winRate: "0.65" });

    const { handleLiveWallet } = await import("../../src/commands/live");
    await handleLiveWallet(
      { address: "0xabc", chain: "base", mode: "stats" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/dex/wallet");
    expect(url.searchParams.get("address")).toBe("0xabc");
    expect(url.searchParams.get("chain")).toBe("base");
    expect(url.searchParams.get("mode")).toBe("stats");

    const output = JSON.parse(stdout.join(""));
    expect(output.ok).toBe(true);
  });

  test("wallet trades mode passes limit and cursor", async () => {
    mockApiResponse({ trades: [] });

    const { handleLiveWallet } = await import("../../src/commands/live");
    await handleLiveWallet(
      { address: "0xabc", chain: "base", mode: "trades", limit: "50", cursor: "abc123" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.searchParams.get("mode")).toBe("trades");
    expect(url.searchParams.get("limit")).toBe("50");
    expect(url.searchParams.get("cursor")).toBe("abc123");
  });

  test("wallet chart mode passes resolution and timestamps", async () => {
    mockApiResponse({ chart: [] });

    const { handleLiveWallet } = await import("../../src/commands/live");
    await handleLiveWallet(
      { address: "0xabc", chain: "base", mode: "chart", resolution: "1H", start: "1700000000", end: "1700100000" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.searchParams.get("mode")).toBe("chart");
    expect(url.searchParams.get("resolution")).toBe("1H");
    expect(url.searchParams.get("start")).toBe("1700000000");
    expect(url.searchParams.get("end")).toBe("1700100000");
  });

  test("wallet solana uses solana chain param", async () => {
    mockApiResponse({ pnl: "5.5" });

    const { handleLiveWallet } = await import("../../src/commands/live");
    await handleLiveWallet(
      { address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", chain: "solana" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.searchParams.get("chain")).toBe("solana");
    expect(url.searchParams.get("address")).toBe("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  });
});

describe("wallet top", () => {
  test("wallet top hits /agent/live/dex/top-wallets", async () => {
    mockApiResponse({ wallets: [{ address: "0xabc", pnl: "5000" }] });

    const { handleLiveTopWallets } = await import("../../src/commands/live");
    await handleLiveTopWallets(
      { chain: "base", sort: "pnl", period: "30d", limit: "20", offset: "0" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/dex/top-wallets");
    expect(url.searchParams.get("chain")).toBe("base");
    expect(url.searchParams.get("sort")).toBe("pnl");
    expect(url.searchParams.get("period")).toBe("30d");
    expect(url.searchParams.get("limit")).toBe("20");

    const output = JSON.parse(stdout.join(""));
    expect(output.ok).toBe(true);
  });

  test("wallet top with volume sort and 1w period", async () => {
    mockApiResponse({ wallets: [] });

    const { handleLiveTopWallets } = await import("../../src/commands/live");
    await handleLiveTopWallets(
      { chain: "solana", sort: "volume", period: "1w", limit: "10" },
      { apiUrl: "https://fomolt.test", apiKey: "k" }
    );

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.searchParams.get("sort")).toBe("volume");
    expect(url.searchParams.get("period")).toBe("1w");
    expect(url.searchParams.get("limit")).toBe("10");
  });
});
