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

test("twitter trends sends woeid param", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          response: { trends: [{ name: "#crypto" }] },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", "X-Request-Id": "r1" },
        }
      )
    )
  );
  globalThis.fetch = mockFetch as any;

  const { handleTwitterTrends } = await import("../../src/commands/twitter");
  await handleTwitterTrends({ woeid: "23424977" }, {
    apiUrl: "https://fomolt.test",
    apiKey: "k",
  });

  const url = new URL(mockFetch.mock.calls[0][0]);
  expect(url.pathname).toContain("/agent/twitter/trends");
  expect(url.searchParams.get("woeid")).toBe("23424977");
});

test("twitter thread sends tweetId in path", async () => {
  mockApiResponse({ tweets: [{ id: "111", text: "thread start" }] });

  const { handleTwitterThread } = await import("../../src/commands/twitter");
  await handleTwitterThread("111", {
    apiUrl: "https://fomolt.test",
    apiKey: "k",
  });

  const url = (globalThis.fetch as any).mock.calls[0][0];
  expect(url).toContain("/agent/twitter/tweets/111/thread");
});

test("twitter quotes sends tweetId and cursor", async () => {
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

  const { handleTwitterQuotes } = await import("../../src/commands/twitter");
  await handleTwitterQuotes("222", { cursor: "cur1" }, {
    apiUrl: "https://fomolt.test",
    apiKey: "k",
  });

  const url = new URL(mockFetch.mock.calls[0][0]);
  expect(url.pathname).toContain("/agent/twitter/tweets/222/quotes");
  expect(url.searchParams.get("cursor")).toBe("cur1");
});

test("twitter replies sends tweetId, sort, and cursor", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          response: { tweets: [] },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", "X-Request-Id": "r1" },
        }
      )
    )
  );
  globalThis.fetch = mockFetch as any;

  const { handleTwitterReplies } = await import("../../src/commands/twitter");
  await handleTwitterReplies("333", { sort: "latest", cursor: "cur2" }, {
    apiUrl: "https://fomolt.test",
    apiKey: "k",
  });

  const url = new URL(mockFetch.mock.calls[0][0]);
  expect(url.pathname).toContain("/agent/twitter/tweets/333/replies");
  expect(url.searchParams.get("sort")).toBe("latest");
  expect(url.searchParams.get("cursor")).toBe("cur2");
});

test("twitter user-search sends query and cursor", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          response: { users: [{ username: "vitalik" }] },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", "X-Request-Id": "r1" },
        }
      )
    )
  );
  globalThis.fetch = mockFetch as any;

  const { handleTwitterUserSearch } = await import("../../src/commands/twitter");
  await handleTwitterUserSearch({ query: "vitalik", cursor: "cur3" }, {
    apiUrl: "https://fomolt.test",
    apiKey: "k",
  });

  const url = new URL(mockFetch.mock.calls[0][0]);
  expect(url.pathname).toContain("/agent/twitter/users/search");
  expect(url.searchParams.get("query")).toBe("vitalik");
  expect(url.searchParams.get("cursor")).toBe("cur3");
});

test("twitter followers sends username and cursor", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          response: { users: [] },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", "X-Request-Id": "r1" },
        }
      )
    )
  );
  globalThis.fetch = mockFetch as any;

  const { handleTwitterFollowers } = await import("../../src/commands/twitter");
  await handleTwitterFollowers("crypto_kol", { cursor: "cur4" }, {
    apiUrl: "https://fomolt.test",
    apiKey: "k",
  });

  const url = new URL(mockFetch.mock.calls[0][0]);
  expect(url.pathname).toContain("/agent/twitter/users/crypto_kol/followers");
  expect(url.searchParams.get("cursor")).toBe("cur4");
});

test("twitter following sends username and cursor", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          response: { users: [] },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", "X-Request-Id": "r1" },
        }
      )
    )
  );
  globalThis.fetch = mockFetch as any;

  const { handleTwitterFollowing } = await import("../../src/commands/twitter");
  await handleTwitterFollowing("crypto_kol", { cursor: "cur5" }, {
    apiUrl: "https://fomolt.test",
    apiKey: "k",
  });

  const url = new URL(mockFetch.mock.calls[0][0]);
  expect(url.pathname).toContain("/agent/twitter/users/crypto_kol/following");
  expect(url.searchParams.get("cursor")).toBe("cur5");
});

test("twitter mentions sends username and cursor", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          response: { tweets: [] },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", "X-Request-Id": "r1" },
        }
      )
    )
  );
  globalThis.fetch = mockFetch as any;

  const { handleTwitterMentions } = await import("../../src/commands/twitter");
  await handleTwitterMentions("crypto_kol", { cursor: "cur6" }, {
    apiUrl: "https://fomolt.test",
    apiKey: "k",
  });

  const url = new URL(mockFetch.mock.calls[0][0]);
  expect(url.pathname).toContain("/agent/twitter/users/crypto_kol/mentions");
  expect(url.searchParams.get("cursor")).toBe("cur6");
});
