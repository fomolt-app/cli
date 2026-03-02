import { Command } from "commander";
import { success, successWithHint, error } from "../output";
import { getAuthClient, type CmdContext } from "../context";
import { validatePositiveNumber, validateLimit, validateSlippage, validateChain, validateAddress, type Chain } from "../validate";

export function requireBase(chain: Chain, command: string): void {
  if (chain !== "base") {
    error(`${command} is only available on Base`, "INVALID_CHAIN");
    process.exit(1);
  }
}

export async function handleLiveTokens(
  opts: { chain: Chain; mode?: string; term?: string; address?: string; limit?: string; minLiquidity?: string; minVolume1h?: string; minHolders?: string; minMarketCap?: string; maxMarketCap?: string; minAge?: string; maxAge?: string; sort?: string; order?: string },
  ctx: CmdContext,
  hintOptions?: { tokenInfoCmd?: string }
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
  const tokens = data && typeof data === "object" && Array.isArray((data as any).tokens) ? (data as any).tokens : [];
  if (tokens.length > 0) {
    const firstAddr = tokens[0].contractAddress || tokens[0].mintAddress || tokens[0].address;
    const baseCmd = hintOptions?.tokenInfoCmd ?? "fomolt token info";
    successWithHint(data, `Get details: ${baseCmd} --chain ${opts.chain} --token ${firstAddr}`);
  } else {
    success(data);
  }
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
  const amtFlag = opts.usdc ? `--usdc ${opts.usdc}` : opts.sol ? `--sol ${opts.sol}` : opts.quantity ? `--quantity ${opts.quantity}` : "";
  successWithHint(data, `Execute: fomolt live trade --chain ${opts.chain} --side ${opts.side} --token ${opts.token} ${amtFlag}`.trim());
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
  successWithHint(data, `Check portfolio: fomolt live portfolio --chain ${opts.chain}`);
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
  successWithHint(data, `Check balance: fomolt live balance --chain ${opts.chain}`);
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
  const quoteFlag = opts.chain === "base" ? "--usdc 10" : "--sol 0.1";
  const hint = `Get a quote: fomolt live quote --chain ${opts.chain} --side buy --token ${opts.address} ${quoteFlag}`;
  if (opts.chain === "solana") {
    const data = await client.get("/agent/live/solana/token-info", { address: opts.address });
    successWithHint(data, hint);
  } else {
    const data = await client.get("/agent/live/dex/token-info", { address: opts.address });
    successWithHint(data, hint);
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
  successWithHint(data, `Execute: fomolt live bridge execute --direction ${opts.direction} --amount ${opts.amount}`);
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
  successWithHint(data, `Check balances: fomolt live balance --chain base && fomolt live balance --chain solana`);
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

export async function handleLiveHolders(
  opts: { address: string; chain: Chain; limit?: string; cursor?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const params: Record<string, string> = { address: opts.address, chain: opts.chain };
  if (opts.limit) params.limit = opts.limit;
  if (opts.cursor) params.cursor = opts.cursor;
  const data = await client.get("/agent/live/dex/holders", params);
  success(data);
}

export async function handleLiveTokenTrades(
  opts: { address: string; chain: Chain; limit?: string; cursor?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const params: Record<string, string> = { address: opts.address, chain: opts.chain };
  if (opts.limit) params.limit = opts.limit;
  if (opts.cursor) params.cursor = opts.cursor;
  const data = await client.get("/agent/live/dex/token-trades", params);
  success(data);
}

export async function handleLiveWallet(
  opts: { address: string; chain: Chain; mode?: string; limit?: string; cursor?: string; token?: string; resolution?: string; start?: string; end?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const params: Record<string, string> = { address: opts.address, chain: opts.chain };
  if (opts.mode) params.mode = opts.mode;
  if (opts.limit) params.limit = opts.limit;
  if (opts.cursor) params.cursor = opts.cursor;
  if (opts.token) params.token = opts.token;
  if (opts.resolution) params.resolution = opts.resolution;
  if (opts.start) params.start = opts.start;
  if (opts.end) params.end = opts.end;
  const data = await client.get("/agent/live/dex/wallet", params);
  success(data);
}

export async function handleLiveTopWallets(
  opts: { chain: Chain; sort?: string; period?: string; limit?: string; offset?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const params: Record<string, string> = { chain: opts.chain };
  if (opts.sort) params.sort = opts.sort;
  if (opts.period) params.period = opts.period;
  if (opts.limit) params.limit = opts.limit;
  if (opts.offset) params.offset = opts.offset;
  const data = await client.get("/agent/live/dex/top-wallets", params);
  success(data);
}

export async function handleLiveTokenWallets(
  opts: { address: string; chain: Chain; sort?: string; period?: string; limit?: string; offset?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const params: Record<string, string> = { address: opts.address, chain: opts.chain };
  if (opts.sort) params.sort = opts.sort;
  if (opts.period) params.period = opts.period;
  if (opts.limit) params.limit = opts.limit;
  if (opts.offset) params.offset = opts.offset;
  const data = await client.get("/agent/live/dex/token-wallets", params);
  success(data);
}

export async function handleLiveTopTraders(
  opts: { address: string; chain: Chain; period?: string; limit?: string; offset?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const params: Record<string, string> = { address: opts.address, chain: opts.chain };
  if (opts.period) params.period = opts.period;
  if (opts.limit) params.limit = opts.limit;
  if (opts.offset) params.offset = opts.offset;
  const data = await client.get("/agent/live/dex/top-traders", params);
  success(data);
}

export async function handleLiveSparklines(
  opts: { address: string; chain: Chain; resolution?: string; from?: string; to?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const params: Record<string, string> = { address: opts.address, chain: opts.chain };
  if (opts.resolution) params.resolution = opts.resolution;
  if (opts.from) params.from = opts.from;
  if (opts.to) params.to = opts.to;
  const data = await client.get("/agent/live/dex/sparklines", params);
  success(data);
}

export async function handleLivePairStats(
  opts: { pairAddress: string; chain: Chain; durations?: string; bucketCount?: string; tokenOfInterest?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const params: Record<string, string> = { pairAddress: opts.pairAddress, chain: opts.chain };
  if (opts.durations) params.durations = opts.durations;
  if (opts.bucketCount) params.bucketCount = opts.bucketCount;
  if (opts.tokenOfInterest) params.tokenOfInterest = opts.tokenOfInterest;
  const data = await client.get("/agent/live/dex/pair-stats", params);
  success(data);
}

export async function handleLiveLiquidityLocks(
  opts: { chain: Chain; pairAddress?: string; tokenAddress?: string; cursor?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const params: Record<string, string> = { chain: opts.chain };
  if (opts.pairAddress) params.pairAddress = opts.pairAddress;
  if (opts.tokenAddress) params.tokenAddress = opts.tokenAddress;
  if (opts.cursor) params.cursor = opts.cursor;
  const data = await client.get("/agent/live/dex/liquidity-locks", params);
  success(data);
}

export async function handleLiveLifecycleEvents(
  opts: { address: string; chain: Chain; limit?: string; cursor?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const params: Record<string, string> = { address: opts.address, chain: opts.chain };
  if (opts.limit) params.limit = opts.limit;
  if (opts.cursor) params.cursor = opts.cursor;
  const data = await client.get("/agent/live/dex/lifecycle-events", params);
  success(data);
}

export async function handleLiveTokenPairs(
  opts: { address: string; chain: Chain; limit?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const params: Record<string, string> = { address: opts.address, chain: opts.chain };
  if (opts.limit) params.limit = opts.limit;
  const data = await client.get("/agent/live/dex/token-pairs", params);
  success(data);
}

export async function handleLiveCommunityNotes(
  opts: { chain?: Chain; address?: string; proposalType?: string; limit?: string; cursor?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const params: Record<string, string> = {};
  if (opts.chain) params.chain = opts.chain;
  if (opts.address) params.address = opts.address;
  if (opts.proposalType) params.proposalType = opts.proposalType;
  if (opts.limit) params.limit = opts.limit;
  if (opts.cursor) params.cursor = opts.cursor;
  const data = await client.get("/agent/live/dex/community-notes", params);
  success(data);
}

export function liveCommands(getContext: () => CmdContext): Command {
  const cmd = new Command("live").description(
    "Live on-chain trading on Base & Solana"
  );

  cmd
    .command("balance")
    .description("Check account balance")
    .requiredOption("-c, --chain <chain>", "Chain: base or solana")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      return handleLiveBalance({ chain }, getContext());
    });

  cmd
    .command("deposit")
    .description("Get deposit address and instructions")
    .requiredOption("-c, --chain <chain>", "Chain: base or solana")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      return handleLiveDeposit({ chain }, getContext());
    });

  cmd
    .command("quote")
    .description("Get a swap quote without executing. Base buys: --usdc. Solana buys: --sol. Sells: --quantity (Base) or --percent (Solana)")
    .requiredOption("-c, --chain <chain>", "Chain: base or solana")
    .requiredOption("-s, --side <side>", "buy or sell")
    .requiredOption("-t, --token <address>", "Token address")
    .option("--usdc <amount>", "USDC to spend (Base buy orders)")
    .option("--sol <amount>", "SOL to spend (Solana buy orders)")
    .option("--quantity <amount>", "Token quantity to sell (sell orders)")
    .option("--slippage <pct>", "Slippage tolerance %")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      validateAddress(opts.token, chain);
      if (chain === "base" && opts.sol) {
        error("Use --usdc for Base buys, --sol is for Solana", "WRONG_CHAIN_FLAG");
        process.exit(1);
      }
      if (chain === "solana" && opts.usdc) {
        error("Use --sol for Solana buys, --usdc is for Base", "WRONG_CHAIN_FLAG");
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
    .description("Execute an on-chain token swap. Base buys: --usdc. Base sells: --quantity. Solana buys: --sol. Solana sells: --percent")
    .requiredOption("-c, --chain <chain>", "Chain: base or solana")
    .requiredOption("-s, --side <side>", "buy or sell")
    .requiredOption("-t, --token <address>", "Token address")
    .option("--usdc <amount>", "USDC to spend (Base buy orders)")
    .option("--sol <amount>", "SOL to spend (Solana buy orders)")
    .option("--quantity <amount>", "Token quantity to sell (Base sell orders)")
    .option("--percent <pct>", "Percent of holdings to sell, 1-100 (Solana sell orders)")
    .option("--slippage <pct>", "Slippage tolerance %")
    .option("--note <text>", "Trade note")
    .addHelpText("after", "\nExamples:\n  fomolt live trade -c solana -s buy -t <mint> --sol 0.1\n  fomolt live trade -c base -s sell -t <address> --quantity 1000")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      validateAddress(opts.token, chain);
      if (chain === "base" && opts.sol) {
        error("Use --usdc for Base buys, --sol is for Solana", "WRONG_CHAIN_FLAG");
        process.exit(1);
      }
      if (chain === "solana" && opts.usdc) {
        error("Use --sol for Solana buys, --usdc is for Base", "WRONG_CHAIN_FLAG");
        process.exit(1);
      }
      if (opts.quantity && chain === "solana") {
        error("Use --percent for Solana sells, --quantity is for Base only", "WRONG_CHAIN_FLAG");
        process.exit(1);
      }
      if (opts.percent && chain !== "solana") {
        error("Use --quantity for Base sells, --percent is for Solana only", "WRONG_CHAIN_FLAG");
        process.exit(1);
      }
      if (opts.usdc) validatePositiveNumber(opts.usdc, "--usdc");
      if (opts.sol) validatePositiveNumber(opts.sol, "--sol");
      if (opts.quantity) validatePositiveNumber(opts.quantity, "--quantity");
      if (opts.percent) {
        validatePositiveNumber(opts.percent, "--percent");
        const pct = parseFloat(opts.percent);
        if (pct < 0.01 || pct > 100) {
          error("--percent must be between 0.01 and 100", "INVALID_AMOUNT");
          process.exit(1);
        }
      }
      if (opts.slippage) validateSlippage(opts.slippage);
      return handleLiveTrade({ ...opts, chain }, getContext());
    });

  cmd
    .command("withdraw")
    .description("Withdraw funds from account")
    .requiredOption("-c, --chain <chain>", "Chain: base or solana")
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
    .requiredOption("-c, --chain <chain>", "Chain: base or solana")
    .addHelpText("after", "\nExamples:\n  fomolt live portfolio -c solana\n  fomolt live portfolio -c base")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      return handleLivePortfolio({ chain }, getContext());
    });

  cmd
    .command("trades")
    .description("View live trade history")
    .requiredOption("-c, --chain <chain>", "Chain: base or solana")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("-n, --limit <n>", "Max results (1-100)")
    .option("-t, --token <address>", "Filter by token")
    .option("-s, --side <side>", "Filter by side (buy/sell)")
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
    .requiredOption("-c, --chain <chain>", "Chain: base or solana")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      return handleLivePerformance({ chain }, getContext());
    });

  // ── Bridge subcommands ──

  const bridge = new Command("bridge").description(
    "Bridge funds between Base and Solana"
  );

  bridge
    .command("quote")
    .description("Get a bridge quote. base_to_solana: amount in USDC. solana_to_base: amount in SOL")
    .requiredOption("--direction <dir>", "Bridge direction: base_to_solana or solana_to_base")
    .requiredOption("--amount <amount>", "Amount to bridge (USDC for base_to_solana, SOL for solana_to_base)")
    .option("--slippage <pct>", "Slippage tolerance % (default 3)")
    .action(async (opts) => {
      if (opts.direction !== "base_to_solana" && opts.direction !== "solana_to_base") {
        error('--direction must be "base_to_solana" or "solana_to_base"', "INVALID_DIRECTION");
        process.exit(1);
      }
      validatePositiveNumber(opts.amount, "--amount");
      if (opts.slippage) validateSlippage(opts.slippage);
      return handleLiveBridgeQuote(opts, getContext());
    });

  bridge
    .command("execute")
    .description("Execute a bridge transfer. base_to_solana: amount in USDC. solana_to_base: amount in SOL")
    .requiredOption("--direction <dir>", "Bridge direction: base_to_solana or solana_to_base")
    .requiredOption("--amount <amount>", "Amount to bridge (USDC for base_to_solana, SOL for solana_to_base)")
    .option("--slippage <pct>", "Slippage tolerance % (default 3)")
    .option("--note <text>", "Transfer note")
    .action(async (opts) => {
      if (opts.direction !== "base_to_solana" && opts.direction !== "solana_to_base") {
        error('--direction must be "base_to_solana" or "solana_to_base"', "INVALID_DIRECTION");
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
    .requiredOption("-c, --chain <chain>", "Chain: base or solana")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      requireBase(chain, "session-key");
      return handleLiveSessionKey(getContext());
    });

  return cmd;
}
