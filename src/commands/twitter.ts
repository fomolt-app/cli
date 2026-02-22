import { Command } from "commander";
import { success } from "../output";
import { getAuthClient, type CmdContext } from "../context";
import { validateUsername, validateTweetId, validateQuery } from "../validate";

export async function handleTwitterSearch(
  opts: { query: string; type?: string; cursor?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const params: Record<string, string> = { query: opts.query };
  if (opts.type) params.queryType = opts.type;
  if (opts.cursor) params.cursor = opts.cursor;
  const data = await client.get("/agent/twitter/search", params);
  success(data);
}

export async function handleTwitterUser(
  username: string,
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.get(`/agent/twitter/users/${username}`);
  success(data);
}

export async function handleTwitterTweets(
  username: string,
  opts: { cursor?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const params: Record<string, string> = {};
  if (opts.cursor) params.cursor = opts.cursor;
  const data = await client.get(`/agent/twitter/users/${username}/tweets`, params);
  success(data);
}

export async function handleTwitterTweet(
  tweetId: string,
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.get(`/agent/twitter/tweets/${tweetId}`);
  success(data);
}

export async function handleTwitterUsage(ctx: CmdContext): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.get("/agent/twitter/usage");
  success(data);
}

export async function handleTwitterTrends(
  opts: { woeid?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const params: Record<string, string> = {};
  if (opts.woeid) params.woeid = opts.woeid;
  const data = await client.get("/agent/twitter/trends", params);
  success(data);
}

export async function handleTwitterThread(
  tweetId: string,
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.get(`/agent/twitter/tweets/${tweetId}/thread`);
  success(data);
}

export async function handleTwitterQuotes(
  tweetId: string,
  opts: { cursor?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const params: Record<string, string> = {};
  if (opts.cursor) params.cursor = opts.cursor;
  const data = await client.get(`/agent/twitter/tweets/${tweetId}/quotes`, params);
  success(data);
}

export async function handleTwitterReplies(
  tweetId: string,
  opts: { sort?: string; cursor?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const params: Record<string, string> = {};
  if (opts.sort) params.sort = opts.sort;
  if (opts.cursor) params.cursor = opts.cursor;
  const data = await client.get(`/agent/twitter/tweets/${tweetId}/replies`, params);
  success(data);
}

export async function handleTwitterUserSearch(
  opts: { query: string; cursor?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const params: Record<string, string> = { query: opts.query };
  if (opts.cursor) params.cursor = opts.cursor;
  const data = await client.get("/agent/twitter/users/search", params);
  success(data);
}

export async function handleTwitterFollowers(
  username: string,
  opts: { cursor?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const params: Record<string, string> = {};
  if (opts.cursor) params.cursor = opts.cursor;
  const data = await client.get(`/agent/twitter/users/${username}/followers`, params);
  success(data);
}

export async function handleTwitterFollowing(
  username: string,
  opts: { cursor?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const params: Record<string, string> = {};
  if (opts.cursor) params.cursor = opts.cursor;
  const data = await client.get(`/agent/twitter/users/${username}/following`, params);
  success(data);
}

export async function handleTwitterMentions(
  username: string,
  opts: { cursor?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const params: Record<string, string> = {};
  if (opts.cursor) params.cursor = opts.cursor;
  const data = await client.get(`/agent/twitter/users/${username}/mentions`, params);
  success(data);
}

export function twitterCommands(getContext: () => CmdContext): Command {
  const cmd = new Command("twitter").description(
    "Twitter data proxy — search tweets, profiles, timelines"
  );

  cmd
    .command("search")
    .description("Search tweets by query ($0.01/tweet returned)")
    .requiredOption("--query <text>", "Search query (1-500 chars)")
    .option("--type <type>", "Latest or Top", "Latest")
    .option("--cursor <cursor>", "Pagination cursor from previous response")
    .action(async (opts) => {
      validateQuery(opts.query);
      return handleTwitterSearch(opts, getContext());
    });

  cmd
    .command("user <username>")
    .description("Look up a Twitter user profile ($0.01)")
    .action(async (username) => {
      validateUsername(username);
      return handleTwitterUser(username, getContext());
    });

  cmd
    .command("tweets <username>")
    .description("Fetch a user's recent tweets ($0.01/tweet returned)")
    .option("--cursor <cursor>", "Pagination cursor from previous response")
    .action(async (username, opts) => {
      validateUsername(username);
      return handleTwitterTweets(username, opts, getContext());
    });

  cmd
    .command("tweet <tweetId>")
    .description("Look up a single tweet by ID ($0.01)")
    .action(async (tweetId) => {
      validateTweetId(tweetId);
      return handleTwitterTweet(tweetId, getContext());
    });

  cmd
    .command("usage")
    .description("View Twitter API usage stats and costs")
    .action(async () => handleTwitterUsage(getContext()));

  cmd
    .command("trends")
    .description("Get trending topics ($0.01)")
    .option("--woeid <id>", "Where On Earth ID (default: 1 = worldwide)", "1")
    .action(async (opts) => handleTwitterTrends(opts, getContext()));

  cmd
    .command("thread <tweetId>")
    .description("Fetch the full thread for a tweet ($0.01/tweet)")
    .action(async (tweetId) => {
      validateTweetId(tweetId);
      return handleTwitterThread(tweetId, getContext());
    });

  cmd
    .command("quotes <tweetId>")
    .description("Fetch quote tweets for a tweet ($0.01/tweet)")
    .option("--cursor <cursor>", "Pagination cursor from previous response")
    .action(async (tweetId, opts) => {
      validateTweetId(tweetId);
      return handleTwitterQuotes(tweetId, opts, getContext());
    });

  cmd
    .command("replies <tweetId>")
    .description("Fetch replies to a tweet ($0.01/tweet)")
    .option("--sort <sort>", "Sort order: relevance, latest, or likes")
    .option("--cursor <cursor>", "Pagination cursor from previous response")
    .action(async (tweetId, opts) => {
      validateTweetId(tweetId);
      return handleTwitterReplies(tweetId, opts, getContext());
    });

  cmd
    .command("user-search")
    .description("Search for Twitter users ($0.01/user)")
    .requiredOption("--query <text>", "Search query (1-500 chars)")
    .option("--cursor <cursor>", "Pagination cursor from previous response")
    .action(async (opts) => {
      validateQuery(opts.query);
      return handleTwitterUserSearch(opts, getContext());
    });

  cmd
    .command("followers <username>")
    .description("Fetch a user's followers ($0.01/user)")
    .option("--cursor <cursor>", "Pagination cursor from previous response")
    .action(async (username, opts) => {
      validateUsername(username);
      return handleTwitterFollowers(username, opts, getContext());
    });

  cmd
    .command("following <username>")
    .description("Fetch accounts a user follows ($0.01/user)")
    .option("--cursor <cursor>", "Pagination cursor from previous response")
    .action(async (username, opts) => {
      validateUsername(username);
      return handleTwitterFollowing(username, opts, getContext());
    });

  cmd
    .command("mentions <username>")
    .description("Fetch tweets mentioning a user ($0.01/tweet)")
    .option("--cursor <cursor>", "Pagination cursor from previous response")
    .action(async (username, opts) => {
      validateUsername(username);
      return handleTwitterMentions(username, opts, getContext());
    });

  return cmd;
}
