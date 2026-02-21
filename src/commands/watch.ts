import { Command } from "commander";
import { success } from "../output";
import { getAuthClient, type CmdContext } from "../context";
import { validateInt, validateTokenAddress } from "../validate";

export async function watchPortfolio(
  opts: { market: string; interval?: number },
  ctx: CmdContext,
  testOpts?: { once?: boolean }
): Promise<void> {
  const client = await getAuthClient(ctx);
  const path =
    opts.market === "live"
      ? "/agent/live/base/portfolio"
      : "/agent/paper/base/portfolio";

  const tick = async () => {
    const data = await client.get(path);
    success(data);
  };

  await tick();
  if (testOpts?.once) return;

  setInterval(tick, (opts.interval ?? 10) * 1000);
}

export async function watchPrice(
  opts: { token: string; market?: string; interval?: number },
  ctx: CmdContext,
  testOpts?: { once?: boolean }
): Promise<void> {
  const client = await getAuthClient(ctx);

  const tick = async () => {
    if (opts.market === "live") {
      const data = await client.post("/agent/live/base/quote", {
        contractAddress: opts.token,
        side: "buy",
        amountUsdc: "1",
      });
      success(data);
    } else {
      const data = await client.get("/agent/paper/base/price", {
        contractAddress: opts.token,
      });
      success(data);
    }
  };

  await tick();
  if (testOpts?.once) return;

  setInterval(tick, (opts.interval ?? 10) * 1000);
}

export function watchCommands(getContext: () => CmdContext): Command {
  const cmd = new Command("watch").description(
    "Monitor portfolio or prices in a loop"
  );

  cmd
    .command("portfolio")
    .description("Watch portfolio value (one JSON line per tick)")
    .option("--market <market>", "paper or live", "paper")
    .option("--interval <seconds>", "Poll interval in seconds", "10")
    .action(async (opts) =>
      watchPortfolio(
        { market: opts.market, interval: validateInt(opts.interval, "--interval", 1, 3600) },
        getContext()
      )
    );

  cmd
    .command("price")
    .description("Watch token price (one JSON line per tick)")
    .requiredOption("--token <address>", "Token contract address")
    .option("--market <market>", "paper or live", "paper")
    .option("--interval <seconds>", "Poll interval in seconds", "10")
    .action(async (opts) =>
      watchPrice(
        { token: validateTokenAddress(opts.token), market: opts.market, interval: validateInt(opts.interval, "--interval", 1, 3600) },
        getContext()
      )
    );

  return cmd;
}
