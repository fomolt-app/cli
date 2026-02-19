import { test, expect, beforeEach, afterEach, mock } from "bun:test";

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

test("watchPortfolio outputs JSON line per tick", async () => {
  globalThis.fetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({ success: true, response: { usdcBalance: "9500", positions: [] } }),
        { status: 200, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
      )
    )
  ) as any;
  const { watchPortfolio } = await import("../../src/commands/watch");
  await watchPortfolio({ market: "paper" }, { apiUrl: "https://fomolt.test", apiKey: "k" }, { once: true });
  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.usdcBalance).toBe("9500");
});

test("watchPrice outputs price per tick", async () => {
  globalThis.fetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({ success: true, response: { priceInUsdc: "0.01234" } }),
        { status: 200, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
      )
    )
  ) as any;
  const { watchPrice } = await import("../../src/commands/watch");
  await watchPrice({ token: "0x68e4" }, { apiUrl: "https://fomolt.test", apiKey: "k" }, { once: true });
  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.priceInUsdc).toBe("0.01234");
});
