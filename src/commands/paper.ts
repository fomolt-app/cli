import { Command } from "commander";
import { success, error } from "../output";
import { getAuthClient, type CmdContext } from "../context";

export async function handlePaperPrice(
  opts: { token: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.get("/agent/paper/dex/price", {
    contractAddress: opts.token,
  });
  success(data);
}

export async function handlePaperTrade(
  opts: { side: string; token: string; usdc?: string; quantity?: string; note?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const body: Record<string, unknown> = {
    contractAddress: opts.token,
    side: opts.side,
  };
  if (opts.usdc) body.amountUsdc = opts.usdc;
  if (opts.quantity) body.quantity = opts.quantity;
  if (opts.note) body.note = opts.note;
  const data = await client.post("/agent/paper/dex/trade", body);
  success(data);
}

export async function handlePaperPortfolio(ctx: CmdContext): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.get("/agent/paper/dex/portfolio");
  success(data);
}

export async function handlePaperTrades(
  opts: { cursor?: string; limit?: string; contractAddress?: string; side?: string; startDate?: string; endDate?: string; sort?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const params: Record<string, string> = {};
  if (opts.cursor) params.cursor = opts.cursor;
  if (opts.limit) params.limit = opts.limit;
  if (opts.contractAddress) params.contractAddress = opts.contractAddress;
  if (opts.side) params.side = opts.side;
  if (opts.startDate) params.startDate = opts.startDate;
  if (opts.endDate) params.endDate = opts.endDate;
  if (opts.sort) params.sort = opts.sort;
  const data = await client.get("/agent/paper/dex/trades", params);
  success(data);
}

export async function handlePaperPerformance(ctx: CmdContext): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.get("/agent/paper/dex/performance");
  success(data);
}

export async function handlePaperPnlImage(
  opts: { token: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.get("/agent/paper/dex/pnl-image", {
    contractAddress: opts.token,
  });
  success(data);
}

export function paperCommands(getContext: () => CmdContext): Command {
  const cmd = new Command("paper").description(
    "Paper trading with simulated USDC"
  );

  cmd
    .command("price")
    .description("Look up token price by contract address")
    .requiredOption("--token <address>", "Token contract address")
    .action(async (opts) => handlePaperPrice({ token: opts.token }, getContext()));

  cmd
    .command("trade")
    .description("Buy or sell a token with paper USDC")
    .requiredOption("--side <side>", "buy or sell")
    .requiredOption("--token <address>", "Token contract address")
    .option("--usdc <amount>", "USDC to spend (buy orders)")
    .option("--quantity <amount>", "Token quantity to sell (sell orders)")
    .option("--note <text>", "Trade note (max 280 chars)")
    .action(async (opts) => {
      if (opts.side === "buy" && !opts.usdc) {
        error("--usdc is required for buy orders", "VALIDATION_ERROR");
        process.exit(1);
      }
      if (opts.side === "sell" && !opts.quantity) {
        error("--quantity is required for sell orders", "VALIDATION_ERROR");
        process.exit(1);
      }
      await handlePaperTrade(opts, getContext());
    });

  cmd
    .command("portfolio")
    .description("View paper portfolio and positions")
    .action(async () => handlePaperPortfolio(getContext()));

  cmd
    .command("trades")
    .description("View paper trade history")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("--limit <n>", "Max results (1-100)")
    .option("--token <address>", "Filter by token")
    .option("--side <side>", "Filter by side (buy/sell)")
    .option("--start-date <date>", "Filter from ISO datetime")
    .option("--end-date <date>", "Filter to ISO datetime")
    .option("--sort <order>", "Sort order (asc/desc)")
    .action(async (opts) =>
      handlePaperTrades(
        {
          cursor: opts.cursor,
          limit: opts.limit,
          contractAddress: opts.token,
          side: opts.side,
          startDate: opts.startDate,
          endDate: opts.endDate,
          sort: opts.sort,
        },
        getContext()
      )
    );

  cmd
    .command("performance")
    .description("View paper performance metrics")
    .action(async () => handlePaperPerformance(getContext()));

  cmd
    .command("pnl-image")
    .description("Generate PnL card image for a position")
    .requiredOption("--token <address>", "Token contract address")
    .action(async (opts) =>
      handlePaperPnlImage({ token: opts.token }, getContext())
    );

  return cmd;
}
