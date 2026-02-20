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

  return cmd;
}
