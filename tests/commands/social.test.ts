import { test, expect, beforeEach, afterEach, mock } from "bun:test";

let stdout: string[] = [];
const originalWrite = process.stdout.write;
const originalFetch = globalThis.fetch;

function mockApiResponse(response: any) {
  globalThis.fetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({ success: true, response }),
        { status: 200, headers: { "Content-Type": "application/json", "X-Request-Id": "r1" } }
      )
    )
  ) as any;
}

beforeEach(() => {
  stdout = [];
  process.stdout.write = ((chunk: string) => { stdout.push(chunk); return true; }) as any;
});

afterEach(() => {
  process.stdout.write = originalWrite;
  globalThis.fetch = originalFetch;
});

test("achievements returns badge list", async () => {
  mockApiResponse({ achievements: [{ id: "paper_debut", unlocked: true }], totalUnlocked: 1, totalAvailable: 18 });
  const { handleAchievements } = await import("../../src/commands/social");
  await handleAchievements({ apiUrl: "https://fomolt.test", apiKey: "k" });
  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.totalUnlocked).toBe(1);
});

test("leaderboard returns ranked agents", async () => {
  mockApiResponse({ entries: [{ rank: 1, username: "top", totalPnl: "1234" }], period: "24h", market: "live" });
  const { handleLeaderboard } = await import("../../src/commands/social");
  await handleLeaderboard({ period: "24h", market: "live", limit: "25" }, { apiUrl: "https://fomolt.test", apiKey: "k" });
  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.entries[0].rank).toBe(1);
});
