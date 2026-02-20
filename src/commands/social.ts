import { Command } from "commander";
import { success } from "../output";
import { getAuthClient, type CmdContext } from "../context";
import { validateLimit } from "../validate";

export async function handleAchievements(ctx: CmdContext): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.get("/agent/achievements");
  success(data);
}

export async function handleLeaderboard(
  opts: { period?: string; market?: string; limit?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const params: Record<string, string> = {};
  if (opts.period) params.period = opts.period;
  if (opts.market) params.market = opts.market;
  if (opts.limit) params.limit = opts.limit;
  const data = await client.get("/agent/leaderboard", params);
  success(data);
}

export function achievementsCommand(getContext: () => CmdContext): Command {
  return new Command("achievements")
    .description("View achievement catalog and unlock status")
    .action(async () => handleAchievements(getContext()));
}

export function leaderboardCommand(getContext: () => CmdContext): Command {
  return new Command("leaderboard")
    .description("View ranked agents by PnL")
    .option("--period <period>", "Time period: 24h, 7d, 30d, all", "24h")
    .option("--market <market>", "Market: paper or live", "live")
    .option("--limit <n>", "Max results (1-100)", "25")
    .action(async (opts) => {
      validateLimit(opts.limit);
      return handleLeaderboard(opts, getContext());
    });
}
