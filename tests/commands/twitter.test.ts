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

test("twitter search sends query and queryType params", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          response: {
            tweets: [{ id: "1", text: "$DEGEN pumping" }],
            hasNextPage: true,
            nextCursor: "abc",
            usage: { resourceCount: 1, costUsdc: "0.010000" },
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", "X-Request-Id": "r1" },
        }
      )
    )
  );
  globalThis.fetch = mockFetch as any;

  const { handleTwitterSearch } = await import("../../src/commands/twitter");
  await handleTwitterSearch(
    { query: "$DEGEN", type: "Top" },
    { apiUrl: "https://fomolt.test", apiKey: "k" }
  );

  const url = new URL(mockFetch.mock.calls[0][0]);
  expect(url.searchParams.get("query")).toBe("$DEGEN");
  expect(url.searchParams.get("queryType")).toBe("Top");

  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.tweets[0].text).toBe("$DEGEN pumping");
});

test("twitter search passes cursor for pagination", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          response: { tweets: [], hasNextPage: false },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", "X-Request-Id": "r1" },
        }
      )
    )
  );
  globalThis.fetch = mockFetch as any;

  const { handleTwitterSearch } = await import("../../src/commands/twitter");
  await handleTwitterSearch(
    { query: "test", cursor: "DAABCgAB" },
    { apiUrl: "https://fomolt.test", apiKey: "k" }
  );

  const url = new URL(mockFetch.mock.calls[0][0]);
  expect(url.searchParams.get("cursor")).toBe("DAABCgAB");
});

test("twitter user fetches profile by username", async () => {
  mockApiResponse({
    user: {
      id: "295218901",
      username: "VitalikButerin",
      name: "vitalik.eth",
      followerCount: 5000000,
    },
    usage: { resourceCount: 1, costUsdc: "0.010000" },
  });

  const { handleTwitterUser } = await import("../../src/commands/twitter");
  await handleTwitterUser("VitalikButerin", {
    apiUrl: "https://fomolt.test",
    apiKey: "k",
  });

  const url = (globalThis.fetch as any).mock.calls[0][0];
  expect(url).toContain("/agent/twitter/users/VitalikButerin");

  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.user.username).toBe("VitalikButerin");
});

test("twitter tweets fetches user timeline with cursor", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          response: {
            tweets: [{ id: "99", text: "hello" }],
            hasNextPage: false,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", "X-Request-Id": "r1" },
        }
      )
    )
  );
  globalThis.fetch = mockFetch as any;

  const { handleTwitterTweets } = await import("../../src/commands/twitter");
  await handleTwitterTweets("crypto_kol", { cursor: "xyz" }, {
    apiUrl: "https://fomolt.test",
    apiKey: "k",
  });

  const url = new URL(mockFetch.mock.calls[0][0]);
  expect(url.pathname).toContain("/agent/twitter/users/crypto_kol/tweets");
  expect(url.searchParams.get("cursor")).toBe("xyz");
});

test("twitter tweet fetches single tweet by ID", async () => {
  mockApiResponse({
    tweet: { id: "1234567890", text: "gm" },
    usage: { resourceCount: 1, costUsdc: "0.010000" },
  });

  const { handleTwitterTweet } = await import("../../src/commands/twitter");
  await handleTwitterTweet("1234567890", {
    apiUrl: "https://fomolt.test",
    apiKey: "k",
  });

  const url = (globalThis.fetch as any).mock.calls[0][0];
  expect(url).toContain("/agent/twitter/tweets/1234567890");

  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.tweet.id).toBe("1234567890");
});

test("twitter usage returns stats", async () => {
  mockApiResponse({
    costPerResource: "0.01",
    summary: {
      totalCalls: 150,
      totalResources: 2840,
      totalCostUsdc: "28.400000",
    },
    recent: [],
  });

  const { handleTwitterUsage } = await import("../../src/commands/twitter");
  await handleTwitterUsage({ apiUrl: "https://fomolt.test", apiKey: "k" });

  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.summary.totalCalls).toBe(150);
});
