import { Command } from "commander";
import { FomoltClient } from "../client";
import { success, error } from "../output";
import { getAuthClient, type CmdContext } from "../context";
import { validateInt, validatePositiveNumber } from "../validate";

export async function copyAgent(
  name: string,
  opts: { market: string; maxUsdc?: string; interval?: number },
  ctx: CmdContext,
  testOpts?: { once?: boolean; initialCursor?: string }
): Promise<void> {
  // Unauthenticated client to read target's trades
  const reader = new FomoltClient({ apiUrl: ctx.apiUrl });
  // Authenticated client to execute mirror trades
  const trader = await getAuthClient(ctx);

  const tradePath =
    opts.market === "live"
      ? "/agent/live/dex/trade"
      : "/agent/paper/dex/trade";

  let lastSeenId: string | null = testOpts?.initialCursor ?? null;

  const tick = async () => {
    const data = await reader.get(
      `/agent/${encodeURIComponent(name)}/trades`
    );

    const trades: any[] = data.trades ?? [];

    if (!lastSeenId && !testOpts?.initialCursor) {
      // First tick: record latest trade ID, don't mirror
      if (trades.length > 0) {
        lastSeenId = trades[0].id;
      }
      success({ event: "started", agent: name, lastSeenId });
      return;
    }

    // Find new trades (those we haven't seen yet)
    const lastIdx = trades.findIndex((t: any) => t.id === lastSeenId);
    const newTrades = lastIdx === -1 ? trades : trades.slice(0, lastIdx);

    if (newTrades.length === 0) return;

    // Update cursor to the latest trade
    lastSeenId = newTrades[0].id;

    // Mirror each new trade (newest first, but execute oldest first)
    for (const trade of newTrades.reverse()) {
      try {
        const body: Record<string, unknown> = {
          contractAddress: trade.contractAddress,
          side: trade.side,
          note: `copy:${name}`,
        };

        if (trade.side === "buy") {
          const amount = trade.totalUsdc ?? trade.amountUsdc ?? trade.amount;
          if (opts.maxUsdc && parseFloat(amount) > parseFloat(opts.maxUsdc)) {
            body.amountUsdc = opts.maxUsdc;
          } else {
            body.amountUsdc = amount;
          }
        } else {
          // Sell: mirror quantity
          body.quantity = trade.quantity;
        }

        const result = await trader.post(tradePath, body);
        success({ event: "mirror", source: trade, result });
      } catch (err: any) {
        error(
          `Mirror failed for trade ${trade.id}: ${err.message}`,
          "MIRROR_ERROR"
        );
      }
    }
  };

  await tick();
  if (testOpts?.once) return;

  setInterval(tick, (opts.interval ?? 30) * 1000);
}

export function copyCommands(getContext: () => CmdContext): Command {
  return new Command("copy")
    .description("Copy another agent's trades in real-time")
    .argument("<name>", "Agent name to copy")
    .option("--market <market>", "paper or live", "paper")
    .option("--max-usdc <amount>", "Cap buy amount in USDC")
    .option("--interval <seconds>", "Poll interval in seconds", "30")
    .action(async (name: string, opts) => {
      if (opts.maxUsdc) validatePositiveNumber(opts.maxUsdc, "--max-usdc");
      return copyAgent(
        name,
        {
          market: opts.market,
          maxUsdc: opts.maxUsdc,
          interval: validateInt(opts.interval, "--interval", 1, 3600),
        },
        getContext()
      );
    });
}
