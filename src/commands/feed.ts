import { Command } from "commander";
import { FomoltClient } from "../client";
import { success } from "../output";
import type { CmdContext } from "../context";
import { validateLimit, validateAnyAddress, validateOhlcvType } from "../validate";

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

function ohlcvDefaultRange(type: string): { from: string; to: string } {
  const now = Math.floor(Date.now() / 1000);
  const SUB_MINUTE = new Set(["1S", "5S", "15S", "30S"]);
  const MINUTE = new Set(["1m", "5m", "15m", "30m"]);
  const LONG = new Set(["12H", "1D", "7D"]);
  let duration: number;
  if (SUB_MINUTE.has(type)) {
    duration = 3600; // 1 hour
  } else if (MINUTE.has(type)) {
    duration = 86400; // 24 hours
  } else if (LONG.has(type)) {
    duration = 2592000; // 30 days
  } else {
    duration = 604800; // 7 days
  }
  return { from: String(now - duration), to: String(now) };
}

export async function handleOhlcv(
  opts: { token: string; type?: string; from?: string; to?: string },
  ctx: Pick<CmdContext, "apiUrl">
): Promise<void> {
  const client = new FomoltClient({ apiUrl: ctx.apiUrl });
  const type = opts.type ?? "1H";
  const defaults = ohlcvDefaultRange(type);
  const params: Record<string, string> = {
    type,
    time_from: opts.from ?? defaults.from,
    time_to: opts.to ?? defaults.to,
  };
  const data = await client.get(`/token/${opts.token}/ohlcv`, params);
  success(data);
}

export function ohlcvCommand(getContext: () => CmdContext): Command {
  return new Command("ohlcv")
    .description("Fetch OHLCV candle data for a token (no auth required)")
    .requiredOption("--token <address>", "Token contract address (EVM 0x... or Solana base58)")
    .option("--type <type>", "Candle interval: 1S, 5S, 15S, 30S, 1m, 5m, 15m, 30m, 1H, 4H, 12H, 1D, 7D", "1H")
    .option("--from <unix>", "Start time (unix timestamp)")
    .option("--to <unix>", "End time (unix timestamp)")
    .addHelpText("after", "\nSub-minute types (1S-30S) are limited to the last 24 hours.\nDefaults: sub-minute → 1h, minute → 24h, 1H/4H → 7d, 12H/1D/7D → 30d.")
    .action(async (opts) => {
      validateAnyAddress(opts.token);
      validateOhlcvType(opts.type);
      return handleOhlcv(opts, getContext());
    });
}
