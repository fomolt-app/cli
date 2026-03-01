import { Command } from "commander";
import { success } from "../output";
import { getAuthClient, type CmdContext } from "../context";
import { validateInt, validateChain, validateAddress, validatePositiveNumber, type Chain } from "../validate";

export async function watchPortfolio(
  opts: { market: string; chain: Chain; interval?: number },
  ctx: CmdContext,
  testOpts?: { once?: boolean }
): Promise<void> {
  const client = await getAuthClient(ctx);
  const prefix = opts.chain;
  const path =
    opts.market === "live"
      ? `/agent/live/${prefix}/portfolio`
      : `/agent/paper/${prefix}/portfolio`;

  const tick = async () => {
    const data = await client.get(path);
    success(data);
  };

  await tick();
  if (testOpts?.once) return;

  setInterval(tick, (opts.interval ?? 10) * 1000);
}

export async function watchPrice(
  opts: { token: string; chain: Chain; market?: string; interval?: number },
  ctx: CmdContext,
  testOpts?: { once?: boolean }
): Promise<void> {
  const client = await getAuthClient(ctx);
  const prefix = opts.chain;
  const addrField = opts.chain === "base" ? "contractAddress" : "mintAddress";
  const amountField = opts.chain === "base" ? "amountUsdc" : "amountSol";

  const tick = async () => {
    if (opts.market === "live") {
      const data = await client.post(`/agent/live/${prefix}/quote`, {
        [addrField]: opts.token,
        side: "buy",
        [amountField]: "1",
      });
      success(data);
    } else {
      const data = await client.get(`/agent/paper/${prefix}/price`, {
        [addrField]: opts.token,
      });
      success(data);
    }
  };

  await tick();
  if (testOpts?.once) return;

  setInterval(tick, (opts.interval ?? 10) * 1000);
}

export async function watchTokens(
  opts: { chain: Chain; interval?: number; minLiquidity?: string; minHolders?: string },
  ctx: CmdContext,
  testOpts?: { once?: boolean }
): Promise<void> {
  const client = await getAuthClient(ctx);
  const prefix = opts.chain;
  const seen = new Set<string>();

  const tick = async () => {
    const params: Record<string, string> = { mode: "new" };
    if (opts.minLiquidity) params.min_liquidity = opts.minLiquidity;
    if (opts.minHolders) params.min_holder = opts.minHolders;
    const data = await client.get(`/agent/live/${prefix}/tokens`, params);
    const tokens = data.tokens ?? [];
    const addrField = opts.chain === "base" ? "contractAddress" : "mintAddress";
    for (const token of tokens) {
      const addr = token[addrField];
      if (addr && !seen.has(addr)) {
        seen.add(addr);
        success(token);
      }
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
    .requiredOption("--chain <chain>", "Chain: base or solana")
    .option("--market <market>", "paper or live", "paper")
    .option("--interval <seconds>", "Poll interval in seconds", "10")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      return watchPortfolio(
        { market: opts.market, chain, interval: validateInt(opts.interval, "--interval", 1, 3600) },
        getContext()
      );
    });

  cmd
    .command("price")
    .description("Watch token price (one JSON line per tick)")
    .requiredOption("--chain <chain>", "Chain: base or solana")
    .requiredOption("--token <address>", "Token address")
    .option("--market <market>", "paper or live", "paper")
    .option("--interval <seconds>", "Poll interval in seconds", "10")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      return watchPrice(
        { token: validateAddress(opts.token, chain), chain, market: opts.market, interval: validateInt(opts.interval, "--interval", 1, 3600) },
        getContext()
      );
    });

  cmd
    .command("tokens")
    .description("Watch for new tokens (one JSON line per new token, deduped)")
    .requiredOption("--chain <chain>", "Chain: base or solana")
    .option("--interval <seconds>", "Poll interval in seconds", "10")
    .option("--min-liquidity <amount>", "Minimum liquidity filter")
    .option("--min-holders <count>", "Minimum holder count filter")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      if (opts.minLiquidity) validatePositiveNumber(opts.minLiquidity, "--min-liquidity");
      if (opts.minHolders) validatePositiveNumber(opts.minHolders, "--min-holders");
      return watchTokens(
        { chain, interval: validateInt(opts.interval, "--interval", 1, 3600), minLiquidity: opts.minLiquidity, minHolders: opts.minHolders },
        getContext()
      );
    });

  return cmd;
}
