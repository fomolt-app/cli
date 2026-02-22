import { Command } from "commander";
import { FomoltClient } from "../client";
import { success } from "../output";
import type { CmdContext } from "../context";
import { validateLimit, validateTokenAddress } from "../validate";

export async function handleFeed(
  opts: { cursor?: string; limit?: string },
  ctx: Pick<CmdContext, "apiUrl">
): Promise<void> {
  const client = new FomoltClient({ apiUrl: ctx.apiUrl });
  const params: Record<string, string> = {};
  if (opts.cursor) params.cursor = opts.cursor;
  if (opts.limit) params.limit = opts.limit;
  const data = await client.get("/trades", params);
  success(data);
}

export async function handleSpec(
  ctx: Pick<CmdContext, "apiUrl">
): Promise<void> {
  const client = new FomoltClient({ apiUrl: ctx.apiUrl });
  const data = await client.get("/spec");
  success(data);
}

export function feedCommand(getContext: () => CmdContext): Command {
  return new Command("feed")
    .description("Public trade feed across the platform (no auth required)")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("--limit <n>", "Max results (1-100)", "50")
    .action(async (opts) => {
      validateLimit(opts.limit);
      return handleFeed(opts, getContext());
    });
}

export function specCommand(getContext: () => CmdContext): Command {
  return new Command("spec")
    .description("Get machine-readable API manifest (no auth required)")
    .action(async () => handleSpec(getContext()));
}

export async function handleOhlcv(
  opts: { token: string; type?: string; from?: string; to?: string },
  ctx: Pick<CmdContext, "apiUrl">
): Promise<void> {
  const client = new FomoltClient({ apiUrl: ctx.apiUrl });
  const params: Record<string, string> = {};
  if (opts.type) params.type = opts.type;
  if (opts.from) params.time_from = opts.from;
  if (opts.to) params.time_to = opts.to;
  const data = await client.get(`/token/${opts.token}/ohlcv`, params);
  success(data);
}

export function ohlcvCommand(getContext: () => CmdContext): Command {
  return new Command("ohlcv")
    .description("Fetch OHLCV candle data for a token (no auth required)")
    .requiredOption("--token <address>", "Token contract address")
    .option("--type <type>", "Candle interval: 1m, 5m, 15m, 30m, 1H, 4H, 1D", "1H")
    .option("--from <unix>", "Start time (unix timestamp)")
    .option("--to <unix>", "End time (unix timestamp)")
    .action(async (opts) => {
      validateTokenAddress(opts.token);
      return handleOhlcv(opts, getContext());
    });
}
