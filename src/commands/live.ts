import { Command } from "commander";
import { success, error } from "../output";
import { getAuthClient, type CmdContext } from "../context";
import { validateTokenAddress, validatePositiveNumber, validateLimit, validateSlippage, validateChain, validateAddress, validateSort, validateOrder, type Chain } from "../validate";

export function requireBase(chain: Chain, command: string): void {
  if (chain !== "base") {
    error(`${command} is only available on Base`, "VALIDATION_ERROR");
    process.exit(1);
  }
}

export async function handleLiveTokens(
  opts: { chain: Chain; mode?: string; term?: string; address?: string; limit?: string; minLiquidity?: string; minVolume1h?: string; minHolders?: string; minMarketCap?: string; maxMarketCap?: string; minAge?: string; maxAge?: string; sort?: string; order?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const prefix = opts.chain;
  const params: Record<string, string> = {};
  if (opts.address) params.address = opts.address;
  else if (opts.mode) params.mode = opts.mode;
  if (opts.term) params.term = opts.term;
  if (opts.limit) params.limit = opts.limit;
  if (opts.minLiquidity) params.min_liquidity = opts.minLiquidity;
  if (opts.minVolume1h) params.min_volume_1h_usd = opts.minVolume1h;
  if (opts.minHolders) params.min_holder = opts.minHolders;
  if (opts.minMarketCap) params.min_market_cap = opts.minMarketCap;
  if (opts.maxMarketCap) params.max_market_cap = opts.maxMarketCap;
  if (opts.minAge) params.min_age = opts.minAge;
  if (opts.maxAge) params.max_age = opts.maxAge;
  if (opts.sort) params.sort = opts.sort;
  if (opts.order) params.order = opts.order;
  const data = await client.get(`/agent/live/${prefix}/tokens`, params);
  success(data);
}

export async function handleLiveBalance(
  opts: { chain: Chain },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  // Solana has no dedicated /balance endpoint; /portfolio returns balance + positions
  const path = opts.chain === "base" ? "/agent/live/base/balance" : "/agent/live/solana/portfolio";
  const data = await client.get(path);
  success(data);
}

export async function handleLiveDeposit(
  opts: { chain: Chain },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const prefix = opts.chain;
  const data = await client.get(`/agent/live/${prefix}/deposit`);
  success(data);
}

export async function handleLiveQuote(
  opts: { side: string; token: string; chain: Chain; usdc?: string; sol?: string; quantity?: string; slippage?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const prefix = opts.chain;
  const addrField = opts.chain === "base" ? "contractAddress" : "mintAddress";
  const body: Record<string, unknown> = {
    [addrField]: opts.token,
    side: opts.side,
  };
  if (opts.usdc) body.amountUsdc = opts.usdc;
  if (opts.sol) body.amountSol = opts.sol;
  if (opts.quantity) body.quantity = opts.quantity;
  if (opts.slippage) body.slippage = opts.slippage;
  const data = await client.post(`/agent/live/${prefix}/quote`, body);
  success(data);
}

export async function handleLiveTrade(
  opts: { side: string; token: string; chain: Chain; usdc?: string; sol?: string; quantity?: string; percent?: string; slippage?: string; note?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const prefix = opts.chain;
  const addrField = opts.chain === "base" ? "contractAddress" : "mintAddress";
  const body: Record<string, unknown> = {
    [addrField]: opts.token,
    side: opts.side,
  };
  if (opts.usdc) body.amountUsdc = opts.usdc;
  if (opts.sol) body.amountSol = opts.sol;
  if (opts.quantity) body.quantity = opts.quantity;
  if (opts.percent) body.percent = parseFloat(opts.percent);
  if (opts.slippage) body.slippage = opts.slippage;
  if (opts.note) body.note = opts.note;
  const data = await client.post(`/agent/live/${prefix}/trade`, body);
  success(data);
}

export async function handleLiveWithdraw(
  opts: { chain: Chain; currency: string; amount: string; to: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.post(`/agent/live/${opts.chain}/withdraw`, {
    asset: opts.currency,
    amount: opts.amount,
    to: opts.to,
  });
  success(data);
}

export async function handleLivePortfolio(
  opts: { chain: Chain },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const prefix = opts.chain;
  const data = await client.get(`/agent/live/${prefix}/portfolio`);
  success(data);
}

export async function handleLiveTrades(
  opts: { chain: Chain; cursor?: string; limit?: string; contractAddress?: string; mintAddress?: string; side?: string; status?: string; startDate?: string; endDate?: string; sort?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const prefix = opts.chain;
  const params: Record<string, string> = {};
  if (opts.cursor) params.cursor = opts.cursor;
  if (opts.limit) params.limit = opts.limit;
  if (opts.contractAddress) params.contractAddress = opts.contractAddress;
  if (opts.mintAddress) params.mintAddress = opts.mintAddress;
  if (opts.side) params.side = opts.side;
  if (opts.status) params.status = opts.status;
  if (opts.startDate) params.startDate = opts.startDate;
  if (opts.endDate) params.endDate = opts.endDate;
  if (opts.sort) params.sort = opts.sort;
  const data = await client.get(`/agent/live/${prefix}/trades`, params);
  success(data);
}

export async function handleLivePerformance(
  opts: { chain: Chain },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const prefix = opts.chain;
  const data = await client.get(`/agent/live/${prefix}/performance`);
  success(data);
}

export async function handleLiveTokenInfo(
  opts: { address: string; chain: Chain },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  if (opts.chain === "solana") {
    const data = await client.get("/agent/live/solana/token-info", { address: opts.address });
    success(data);
  } else {
    const data = await client.get("/agent/live/dex/token-info", { address: opts.address });
    success(data);
  }
}

export async function handleLiveBridgeQuote(
  opts: { direction: string; amount: string; slippage?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const body: Record<string, string> = {
    direction: opts.direction,
    amount: opts.amount,
  };
  if (opts.slippage) body.slippage = opts.slippage;
  const data = await client.post("/agent/live/bridge/quote", body);
  success(data);
}

export async function handleLiveBridge(
  opts: { direction: string; amount: string; slippage?: string; note?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const body: Record<string, string> = {
    direction: opts.direction,
    amount: opts.amount,
  };
  if (opts.slippage) body.slippage = opts.slippage;
  if (opts.note) body.note = opts.note;
  const data = await client.post("/agent/live/bridge", body);
  success(data);
}

export async function handleLiveSessionKey(ctx: CmdContext): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.post("/agent/live/base/session-key");
  success(data);
}

export async function handleLivePrice(
  opts: { token: string; chain: Chain },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const prefix = opts.chain;
  const addrField = opts.chain === "base" ? "contractAddress" : "mintAddress";
  const data = await client.get(`/agent/live/${prefix}/price`, { [addrField]: opts.token });
  success(data);
}

export function liveCommands(getContext: () => CmdContext): Command {
  const cmd = new Command("live").description(
    "Live on-chain trading on Base & Solana"
  );

  cmd
    .command("tokens")
    .description("Discover tradeable tokens")
    .requiredOption("--chain <chain>", "Chain: base or solana")
    .option("--mode <mode>", "Discovery mode: trending, search, new", "trending")
    .option("--term <text>", "Search term (required for mode=search)")
    .option("--address <address>", "Exact address lookup (overrides mode)")
    .option("--limit <n>", "Max results (1-100)", "20")
    .option("--min-liquidity <amount>", "Minimum liquidity filter")
    .option("--min-volume-1h <amount>", "Minimum 1h volume in USD filter")
    .option("--min-holders <count>", "Minimum holder count filter")
    .option("--min-market-cap <amount>", "Minimum market cap in USD")
    .option("--max-market-cap <amount>", "Maximum market cap in USD")
    .option("--min-age <minutes>", "Minimum token age in minutes")
    .option("--max-age <minutes>", "Maximum token age in minutes")
    .option("--sort <field>", "Sort by: trending, volume, market_cap, holders, created", "trending")
    .option("--order <dir>", "Sort direction: asc or desc", "desc")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      validateLimit(opts.limit);
      if (opts.address) validateAddress(opts.address, chain, "--address");
      if (opts.minLiquidity) validatePositiveNumber(opts.minLiquidity, "--min-liquidity");
      if (opts.minVolume1h) validatePositiveNumber(opts.minVolume1h, "--min-volume-1h");
      if (opts.minHolders) validatePositiveNumber(opts.minHolders, "--min-holders");
      if (opts.minMarketCap) validatePositiveNumber(opts.minMarketCap, "--min-market-cap");
      if (opts.maxMarketCap) validatePositiveNumber(opts.maxMarketCap, "--max-market-cap");
      if (opts.minAge) validatePositiveNumber(opts.minAge, "--min-age");
      if (opts.maxAge) validatePositiveNumber(opts.maxAge, "--max-age");
      if (opts.sort) validateSort(opts.sort);
      if (opts.order) validateOrder(opts.order);
      return handleLiveTokens({ ...opts, chain }, getContext());
    });

  cmd
    .command("token-info")
    .description("Get detailed token overview (price, market cap, volume, holders)")
    .requiredOption("--chain <chain>", "Chain: base or solana")
    .requiredOption("--address <address>", "Token contract address")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      validateAddress(opts.address, chain, "--address");
      return handleLiveTokenInfo({ address: opts.address, chain }, getContext());
    });

  cmd
    .command("balance")
    .description("Check account balance")
    .requiredOption("--chain <chain>", "Chain: base or solana")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      return handleLiveBalance({ chain }, getContext());
    });

  cmd
    .command("deposit")
    .description("Get deposit address and instructions")
    .requiredOption("--chain <chain>", "Chain: base or solana")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      return handleLiveDeposit({ chain }, getContext());
    });

  cmd
    .command("quote")
    .description("Get a swap quote without executing")
    .requiredOption("--chain <chain>", "Chain: base or solana")
    .requiredOption("--side <side>", "buy or sell")
    .requiredOption("--token <address>", "Token address")
    .option("--usdc <amount>", "USDC to spend (Base buy orders)")
    .option("--sol <amount>", "SOL to spend (Solana buy orders)")
    .option("--quantity <amount>", "Token quantity to sell (sell orders)")
    .option("--slippage <pct>", "Slippage tolerance %")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      validateAddress(opts.token, chain);
      if (chain === "base" && opts.sol) {
        error("Use --usdc for Base buys", "VALIDATION_ERROR");
        process.exit(1);
      }
      if (chain === "solana" && opts.usdc) {
        error("Use --sol for Solana buys", "VALIDATION_ERROR");
        process.exit(1);
      }
      if (opts.usdc) validatePositiveNumber(opts.usdc, "--usdc");
      if (opts.sol) validatePositiveNumber(opts.sol, "--sol");
      if (opts.quantity) validatePositiveNumber(opts.quantity, "--quantity");
      if (opts.slippage) validateSlippage(opts.slippage);
      return handleLiveQuote({ ...opts, chain }, getContext());
    });

  cmd
    .command("trade")
    .description("Execute an on-chain token swap")
    .requiredOption("--chain <chain>", "Chain: base or solana")
    .requiredOption("--side <side>", "buy or sell")
    .requiredOption("--token <address>", "Token address")
    .option("--usdc <amount>", "USDC to spend (Base buy orders)")
    .option("--sol <amount>", "SOL to spend (Solana buy orders)")
    .option("--quantity <amount>", "Token quantity to sell (Base sell orders)")
    .option("--percent <pct>", "Percent of holdings to sell, 1-100 (Solana sell orders)")
    .option("--slippage <pct>", "Slippage tolerance %")
    .option("--note <text>", "Trade note")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      validateAddress(opts.token, chain);
      if (chain === "base" && opts.sol) {
        error("Use --usdc for Base buys", "VALIDATION_ERROR");
        process.exit(1);
      }
      if (chain === "solana" && opts.usdc) {
        error("Use --sol for Solana buys", "VALIDATION_ERROR");
        process.exit(1);
      }
      if (opts.quantity && chain === "solana") {
        error("Use --percent for Solana sells, --quantity is for Base only", "VALIDATION_ERROR");
        process.exit(1);
      }
      if (opts.percent && chain !== "solana") {
        error("--percent is only supported for Solana sells", "VALIDATION_ERROR");
        process.exit(1);
      }
      if (opts.usdc) validatePositiveNumber(opts.usdc, "--usdc");
      if (opts.sol) validatePositiveNumber(opts.sol, "--sol");
      if (opts.quantity) validatePositiveNumber(opts.quantity, "--quantity");
      if (opts.percent) {
        validatePositiveNumber(opts.percent, "--percent");
        const pct = parseFloat(opts.percent);
        if (pct < 0.01 || pct > 100) {
          error("--percent must be between 0.01 and 100", "VALIDATION_ERROR");
          process.exit(1);
        }
      }
      if (opts.slippage) validateSlippage(opts.slippage);
      return handleLiveTrade({ ...opts, chain }, getContext());
    });

  cmd
    .command("withdraw")
    .description("Withdraw funds from account")
    .requiredOption("--chain <chain>", "Chain: base or solana")
    .requiredOption("--currency <currency>", "Asset to withdraw (USDC, ETH, SOL, or token address)")
    .requiredOption("--amount <amount>", "Amount to withdraw")
    .requiredOption("--to <address>", "Destination wallet address")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      validateAddress(opts.to, chain, "--to");
      validatePositiveNumber(opts.amount, "--amount");
      return handleLiveWithdraw({ ...opts, chain }, getContext());
    });

  cmd
    .command("portfolio")
    .description("View live positions with on-chain prices")
    .requiredOption("--chain <chain>", "Chain: base or solana")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      return handleLivePortfolio({ chain }, getContext());
    });

  cmd
    .command("trades")
    .description("View live trade history")
    .requiredOption("--chain <chain>", "Chain: base or solana")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("--limit <n>", "Max results (1-100)")
    .option("--token <address>", "Filter by token")
    .option("--side <side>", "Filter by side (buy/sell)")
    .option("--status <status>", "Filter by status (pending/confirmed/failed)")
    .option("--start-date <date>", "Filter from ISO datetime")
    .option("--end-date <date>", "Filter to ISO datetime")
    .option("--sort <order>", "Sort order (asc/desc)")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      if (opts.limit) validateLimit(opts.limit);
      if (opts.token) validateAddress(opts.token, chain);
      const addrField = chain === "base" ? "contractAddress" : "mintAddress";
      return handleLiveTrades(
        {
          chain,
          cursor: opts.cursor,
          limit: opts.limit,
          [addrField]: opts.token,
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
    .requiredOption("--chain <chain>", "Chain: base or solana")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      return handleLivePerformance({ chain }, getContext());
    });

  cmd
    .command("price")
    .description("Look up the current price of a token")
    .requiredOption("--chain <chain>", "Chain: base or solana")
    .requiredOption("--token <address>", "Token address")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      validateAddress(opts.token, chain);
      return handleLivePrice({ ...opts, chain }, getContext());
    });

  // ── Bridge subcommands ──

  const bridge = new Command("bridge").description(
    "Bridge funds between Base and Solana"
  );

  bridge
    .command("quote")
    .description("Get a bridge quote without executing")
    .requiredOption("--direction <dir>", "Bridge direction: base_to_solana or solana_to_base")
    .requiredOption("--amount <amount>", "Amount to bridge (USDC for base_to_solana, SOL for solana_to_base)")
    .option("--slippage <pct>", "Slippage tolerance % (default 3)")
    .action(async (opts) => {
      if (opts.direction !== "base_to_solana" && opts.direction !== "solana_to_base") {
        error('--direction must be "base_to_solana" or "solana_to_base"', "VALIDATION_ERROR");
        process.exit(1);
      }
      validatePositiveNumber(opts.amount, "--amount");
      if (opts.slippage) validateSlippage(opts.slippage);
      return handleLiveBridgeQuote(opts, getContext());
    });

  bridge
    .command("execute")
    .description("Execute a cross-chain bridge transfer")
    .requiredOption("--direction <dir>", "Bridge direction: base_to_solana or solana_to_base")
    .requiredOption("--amount <amount>", "Amount to bridge (USDC for base_to_solana, SOL for solana_to_base)")
    .option("--slippage <pct>", "Slippage tolerance % (default 3)")
    .option("--note <text>", "Transfer note")
    .action(async (opts) => {
      if (opts.direction !== "base_to_solana" && opts.direction !== "solana_to_base") {
        error('--direction must be "base_to_solana" or "solana_to_base"', "VALIDATION_ERROR");
        process.exit(1);
      }
      validatePositiveNumber(opts.amount, "--amount");
      if (opts.slippage) validateSlippage(opts.slippage);
      return handleLiveBridge(opts, getContext());
    });

  cmd.addCommand(bridge);

  cmd
    .command("session-key")
    .description("Create or retrieve a session key (Base only)")
    .requiredOption("--chain <chain>", "Chain: base or solana")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      requireBase(chain, "session-key");
      return handleLiveSessionKey(getContext());
    });

  return cmd;
}
