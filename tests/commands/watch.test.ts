import { test, expect, beforeEach, afterEach, mock, describe } from "bun:test";

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

// --- Base ---

describe("watch Base", () => {
  test("watchPortfolio outputs JSON line per tick (base paper)", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ success: true, response: { usdcBalance: "9500", positions: [] } }),
          { status: 200, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
        )
      )
    ) as any;
    const { watchPortfolio } = await import("../../src/commands/watch");
    await watchPortfolio({ market: "paper", chain: "base" }, { apiUrl: "https://fomolt.test", apiKey: "k" }, { once: true });

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/paper/base/portfolio");

    const output = JSON.parse(stdout.join(""));
    expect(output.ok).toBe(true);
    expect(output.data.usdcBalance).toBe("9500");
  });

  test("watchPortfolio live uses live base portfolio path", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ success: true, response: { usdcBalance: "450", positions: [] } }),
          { status: 200, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
        )
      )
    ) as any;
    const { watchPortfolio } = await import("../../src/commands/watch");
    await watchPortfolio({ market: "live", chain: "base" }, { apiUrl: "https://fomolt.test", apiKey: "k" }, { once: true });

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/base/portfolio");
  });

  test("watchPrice outputs price per tick (base paper)", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ success: true, response: { priceInUsdc: "0.01234" } }),
          { status: 200, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
        )
      )
    ) as any;
    const { watchPrice } = await import("../../src/commands/watch");
    await watchPrice({ token: "0x68e4", chain: "base" }, { apiUrl: "https://fomolt.test", apiKey: "k" }, { once: true });

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/paper/base/price");
    expect(url.searchParams.get("contractAddress")).toBe("0x68e4");

    const output = JSON.parse(stdout.join(""));
    expect(output.ok).toBe(true);
    expect(output.data.priceInUsdc).toBe("0.01234");
  });

  test("watchPrice live posts quote with amountUsdc (base)", async () => {
    const mockFetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ success: true, response: { price: "0.01234" } }),
          { status: 200, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
        )
      )
    );
    globalThis.fetch = mockFetch as any;
    const { watchPrice } = await import("../../src/commands/watch");
    await watchPrice({ token: "0x68e4", chain: "base", market: "live" }, { apiUrl: "https://fomolt.test", apiKey: "k" }, { once: true });

    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/base/quote");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.contractAddress).toBe("0x68e4");
    expect(body.amountUsdc).toBe("1");
    expect(body.side).toBe("buy");
  });
});

// --- Solana ---

describe("watch Solana", () => {
  test("watchPortfolio uses solana paper portfolio path", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ success: true, response: { solBalance: "48.5", positions: [] } }),
          { status: 200, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
        )
      )
    ) as any;
    const { watchPortfolio } = await import("../../src/commands/watch");
    await watchPortfolio({ market: "paper", chain: "solana" }, { apiUrl: "https://fomolt.test", apiKey: "k" }, { once: true });

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/paper/solana/portfolio");

    const output = JSON.parse(stdout.join(""));
    expect(output.ok).toBe(true);
    expect(output.data.solBalance).toBe("48.5");
  });

  test("watchPortfolio live uses solana live portfolio path", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ success: true, response: { solBalance: "10.5", positions: [] } }),
          { status: 200, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
        )
      )
    ) as any;
    const { watchPortfolio } = await import("../../src/commands/watch");
    await watchPortfolio({ market: "live", chain: "solana" }, { apiUrl: "https://fomolt.test", apiKey: "k" }, { once: true });

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/solana/portfolio");
  });

  test("watchPrice uses solana paper price path with mintAddress", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ success: true, response: { priceInSol: "0.005" } }),
          { status: 200, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
        )
      )
    ) as any;
    const { watchPrice } = await import("../../src/commands/watch");
    await watchPrice(
      { token: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", chain: "solana" },
      { apiUrl: "https://fomolt.test", apiKey: "k" },
      { once: true }
    );

    const url = new URL((globalThis.fetch as any).mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/paper/solana/price");
    expect(url.searchParams.get("mintAddress")).toBe("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  });

  test("watchPrice live posts quote with amountSol and mintAddress (solana)", async () => {
    const mockFetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ success: true, response: { price: "0.005" } }),
          { status: 200, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
        )
      )
    );
    globalThis.fetch = mockFetch as any;
    const { watchPrice } = await import("../../src/commands/watch");
    await watchPrice(
      { token: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", chain: "solana", market: "live" },
      { apiUrl: "https://fomolt.test", apiKey: "k" },
      { once: true }
    );

    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.pathname).toContain("/agent/live/solana/quote");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.mintAddress).toBe("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
    expect(body.amountSol).toBe("1");
    expect(body.side).toBe("buy");
    expect(body.contractAddress).toBeUndefined();
    expect(body.amountUsdc).toBeUndefined();
  });
});
