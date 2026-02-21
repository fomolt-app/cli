import { Command } from "commander";
import { success } from "../output";
import { getAuthClient, type CmdContext } from "../context";
import { validateTokenAddress, validatePositiveNumber, validateLimit, validateSlippage } from "../validate";

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
  const data = await client.get("/agent/live/base/tokens", params);
  success(data);
}

export async function handleLiveBalance(ctx: CmdContext): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.get("/agent/live/base/balance");
  success(data);
}

export async function handleLiveDeposit(ctx: CmdContext): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.get("/agent/live/base/deposit");
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
  const data = await client.post("/agent/live/base/quote", body);
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
  const data = await client.post("/agent/live/base/trade", body);
  success(data);
}

export async function handleLiveWithdraw(
  opts: { currency: string; amount: string; to: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.post("/agent/live/base/withdraw", {
    asset: opts.currency,
    amount: opts.amount,
    to: opts.to,
  });
  success(data);
}

export async function handleLivePortfolio(ctx: CmdContext): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.get("/agent/live/base/portfolio");
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
  const data = await client.get("/agent/live/base/trades", params);
  success(data);
}

export async function handleLivePerformance(ctx: CmdContext): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.get("/agent/live/base/performance");
  success(data);
}

export async function handleLiveTokenInfo(
  opts: { address: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.get("/agent/live/dex/token-info", { address: opts.address });
  success(data);
}

export async function handleLiveSessionKey(ctx: CmdContext): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.post("/agent/live/base/session-key");
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
    .action(async (opts) => {
      validateLimit(opts.limit);
      if (opts.address) validateTokenAddress(opts.address, "--address");
      return handleLiveTokens(opts, getContext());
    });

  cmd
    .command("token-info")
    .description("Get detailed token overview (price, market cap, volume, holders)")
    .requiredOption("--address <address>", "Token contract address")
    .action(async (opts) => {
      validateTokenAddress(opts.address, "--address");
      return handleLiveTokenInfo(opts, getContext());
    });

  cmd
    .command("balance")
    .description("Check smart account USDC balance")
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
    .option("--slippage <pct>", "Slippage tolerance %")
    .action(async (opts) => {
      validateTokenAddress(opts.token);
      if (opts.usdc) validatePositiveNumber(opts.usdc, "--usdc");
      if (opts.quantity) validatePositiveNumber(opts.quantity, "--quantity");
      if (opts.slippage) validateSlippage(opts.slippage);
      return handleLiveQuote(opts, getContext());
    });

  cmd
    .command("trade")
    .description("Execute an on-chain token swap")
    .requiredOption("--side <side>", "buy or sell")
    .requiredOption("--token <address>", "Token contract address")
    .option("--usdc <amount>", "USDC to spend (buy orders)")
    .option("--quantity <amount>", "Token quantity to sell (sell orders)")
    .option("--slippage <pct>", "Slippage tolerance %")
    .option("--note <text>", "Trade note")
    .action(async (opts) => {
      validateTokenAddress(opts.token);
      if (opts.usdc) validatePositiveNumber(opts.usdc, "--usdc");
      if (opts.quantity) validatePositiveNumber(opts.quantity, "--quantity");
      if (opts.slippage) validateSlippage(opts.slippage);
      return handleLiveTrade(opts, getContext());
    });

  cmd
    .command("withdraw")
    .description("Withdraw USDC or ETH from smart account")
    .requiredOption("--currency <currency>", "Asset to withdraw: USDC or ETH")
    .requiredOption("--amount <amount>", "Amount to withdraw")
    .requiredOption("--to <address>", "Destination wallet address")
    .action(async (opts) => {
      validateTokenAddress(opts.to, "--to");
      validatePositiveNumber(opts.amount, "--amount");
      return handleLiveWithdraw(opts, getContext());
    });

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
    .action(async (opts) => {
      if (opts.limit) validateLimit(opts.limit);
      if (opts.token) validateTokenAddress(opts.token);
      return handleLiveTrades(
        {
          cursor: opts.cursor,
          limit: opts.limit,
          contractAddress: opts.token,
          side: opts.side,
          status: opts.status,
          startDate: opts.startDate,
          endDate: opts.endDate,
          sort: opts.sort,
        },
        getContext()
      );
    });

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
