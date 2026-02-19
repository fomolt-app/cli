import { Command } from "commander";
import { success, error } from "../output";
import { getAuthClient, type CmdContext } from "../context";

export async function handleLiveTokens(
  opts: { mode?: string; term?: string; address?: string; limit?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const params: Record<string, string> = {};
  if (opts.address) params.address = opts.address;
  else if (opts.mode) params.mode = opts.mode;
  if (opts.term) params.term = opts.term;
  if (opts.limit) params.limit = opts.limit;
  const data = await client.get("/agent/live/dex/tokens", params);
  success(data);
}

export async function handleLiveBalance(ctx: CmdContext): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.get("/agent/live/dex/balance");
  success(data);
}

export async function handleLiveDeposit(ctx: CmdContext): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.get("/agent/live/dex/deposit");
  success(data);
}

export async function handleLiveQuote(
  opts: { side: string; token: string; usdc?: string; quantity?: string; slippage?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const body: Record<string, unknown> = {
    contractAddress: opts.token,
    side: opts.side,
  };
  if (opts.usdc) body.amountUsdc = opts.usdc;
  if (opts.quantity) body.quantity = opts.quantity;
  if (opts.slippage) body.slippage = opts.slippage;
  const data = await client.post("/agent/live/dex/quote", body);
  success(data);
}

export async function handleLiveTrade(
  opts: { side: string; token: string; usdc?: string; quantity?: string; slippage?: string; note?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const body: Record<string, unknown> = {
    contractAddress: opts.token,
    side: opts.side,
  };
  if (opts.usdc) body.amountUsdc = opts.usdc;
  if (opts.quantity) body.quantity = opts.quantity;
  if (opts.slippage) body.slippage = opts.slippage;
  if (opts.note) body.note = opts.note;
  const data = await client.post("/agent/live/dex/trade", body);
  success(data);
}

export async function handleLiveWithdraw(
  opts: { currency: string; amount: string; to: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.post("/agent/live/dex/withdraw", {
    asset: opts.currency,
    amount: opts.amount,
    to: opts.to,
  });
  success(data);
}

export async function handleLivePortfolio(ctx: CmdContext): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.get("/agent/live/dex/portfolio");
  success(data);
}

export async function handleLiveTrades(
  opts: { cursor?: string; limit?: string; contractAddress?: string; side?: string; status?: string; startDate?: string; endDate?: string; sort?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const params: Record<string, string> = {};
  if (opts.cursor) params.cursor = opts.cursor;
  if (opts.limit) params.limit = opts.limit;
  if (opts.contractAddress) params.contractAddress = opts.contractAddress;
  if (opts.side) params.side = opts.side;
  if (opts.status) params.status = opts.status;
  if (opts.startDate) params.startDate = opts.startDate;
  if (opts.endDate) params.endDate = opts.endDate;
  if (opts.sort) params.sort = opts.sort;
  const data = await client.get("/agent/live/dex/trades", params);
  success(data);
}

export async function handleLivePerformance(ctx: CmdContext): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.get("/agent/live/dex/performance");
  success(data);
}

export async function handleLiveSessionKey(ctx: CmdContext): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.post("/agent/live/dex/session-key");
  success(data);
}

export function liveCommands(getContext: () => CmdContext): Command {
  const cmd = new Command("live").description(
    "Live on-chain trading on Base"
  );

  cmd
    .command("tokens")
    .description("Discover tradeable tokens on Base")
    .option("--mode <mode>", "Discovery mode: trending, search, new", "trending")
    .option("--term <text>", "Search term (required for mode=search)")
    .option("--address <address>", "Exact contract address lookup (overrides mode)")
    .option("--limit <n>", "Max results (1-100)", "20")
    .action(async (opts) => handleLiveTokens(opts, getContext()));

  cmd
    .command("balance")
    .description("Check smart account USDC and ETH balances")
    .action(async () => handleLiveBalance(getContext()));

  cmd
    .command("deposit")
    .description("Get deposit address and instructions")
    .action(async () => handleLiveDeposit(getContext()));

  cmd
    .command("quote")
    .description("Get a swap quote without executing")
    .requiredOption("--side <side>", "buy or sell")
    .requiredOption("--token <address>", "Token contract address")
    .option("--usdc <amount>", "USDC to spend (buy orders)")
    .option("--quantity <amount>", "Token quantity to sell (sell orders)")
    .option("--slippage <pct>", "Slippage tolerance % (default: 5)")
    .action(async (opts) => {
      if (opts.side === "buy" && !opts.usdc) {
        error("--usdc is required for buy orders", "VALIDATION_ERROR");
        process.exit(1);
      }
      if (opts.side === "sell" && !opts.quantity) {
        error("--quantity is required for sell orders", "VALIDATION_ERROR");
        process.exit(1);
      }
      await handleLiveQuote(opts, getContext());
    });

  cmd
    .command("trade")
    .description("Execute an on-chain token swap")
    .requiredOption("--side <side>", "buy or sell")
    .requiredOption("--token <address>", "Token contract address")
    .option("--usdc <amount>", "USDC to spend (buy orders, max 500)")
    .option("--quantity <amount>", "Token quantity to sell (sell orders)")
    .option("--slippage <pct>", "Slippage tolerance % (default: 5)")
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
      await handleLiveTrade(opts, getContext());
    });

  cmd
    .command("withdraw")
    .description("Withdraw USDC or ETH from smart account")
    .requiredOption("--currency <currency>", "Asset to withdraw: USDC or ETH")
    .requiredOption("--amount <amount>", "Amount to withdraw")
    .requiredOption("--to <address>", "Destination wallet address")
    .action(async (opts) => handleLiveWithdraw(opts, getContext()));

  cmd
    .command("portfolio")
    .description("View live positions with on-chain prices")
    .action(async () => handleLivePortfolio(getContext()));

  cmd
    .command("trades")
    .description("View live trade history")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("--limit <n>", "Max results (1-100)")
    .option("--token <address>", "Filter by token")
    .option("--side <side>", "Filter by side (buy/sell)")
    .option("--status <status>", "Filter by status (pending/confirmed/failed)")
    .option("--start-date <date>", "Filter from ISO datetime")
    .option("--end-date <date>", "Filter to ISO datetime")
    .option("--sort <order>", "Sort order (asc/desc)")
    .action(async (opts) =>
      handleLiveTrades(
        { ...opts, contractAddress: opts.token, startDate: opts.startDate, endDate: opts.endDate },
        getContext()
      )
    );

  cmd
    .command("performance")
    .description("View live performance metrics")
    .action(async () => handleLivePerformance(getContext()));

  cmd
    .command("session-key")
    .description("Create or retrieve a session key")
    .action(async () => handleLiveSessionKey(getContext()));

  return cmd;
}
