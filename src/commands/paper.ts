import { Command } from "commander";
import { success, successWithHint, error } from "../output";
import { getAuthClient, type CmdContext } from "../context";
import { validateTokenAddress, validatePositiveNumber, validateLimit, validateChain, validateSide, validateAddress, normalizeDate, validateNote, validateSolanaMinTrade, type Chain } from "../validate";

export async function handlePaperPrice(
  opts: { token: string; chain: Chain },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const prefix = opts.chain;
  const addrField = opts.chain === "base" ? "contractAddress" : "mintAddress";
  const data = await client.get(`/agent/paper/${prefix}/price`, {
    [addrField]: opts.token,
  });
  success(data);
}

export async function handlePaperTrade(
  opts: { side: string; token: string; chain: Chain; usdc?: string; sol?: string; quantity?: string; percent?: string; note?: string },
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
  if (opts.chain === "solana" && opts.percent) body.percent = Number(opts.percent);
  if (opts.chain === "base" && opts.quantity) body.quantity = opts.quantity;
  if (opts.note) body.note = opts.note;
  const data = await client.post(`/agent/paper/${prefix}/trade`, body);
  successWithHint(data, `Check portfolio: fomolt paper portfolio --chain ${opts.chain}`);
}

export async function handlePaperPortfolio(
  opts: { chain: Chain },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const prefix = opts.chain;
  const data = await client.get(`/agent/paper/${prefix}/portfolio`);
  success(data);
}

export async function handlePaperTrades(
  opts: { chain: Chain; cursor?: string; limit?: string; contractAddress?: string; mintAddress?: string; side?: string; startDate?: string; endDate?: string; sort?: string },
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
  if (opts.startDate) params.startDate = opts.startDate;
  if (opts.endDate) params.endDate = opts.endDate;
  if (opts.sort) params.sort = opts.sort;
  const data = await client.get(`/agent/paper/${prefix}/trades`, params);
  success(data);
}

export async function handlePaperPerformance(
  opts: { chain: Chain },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const prefix = opts.chain;
  const data = await client.get(`/agent/paper/${prefix}/performance`);
  success(data);
}

export async function handlePaperPnlImage(
  opts: { token: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.get("/agent/paper/base/pnl-image", {
    contractAddress: opts.token,
  });
  success(data);
}

export function paperCommands(getContext: () => CmdContext): Command {
  const cmd = new Command("paper").description(
    "Paper trading with simulated funds"
  );

  cmd
    .command("trade")
    .description("Buy or sell a token. Base buys: --usdc. Base sells: --quantity. Solana buys: --sol. Solana sells: --percent (0.01-100)")
    .requiredOption("-c, --chain <chain>", "Chain: base or solana", (val, prev) => {
      if (prev !== undefined) { error("--chain specified multiple times", "INVALID_ARGS"); process.exit(1); }
      return val;
    })
    .requiredOption("-s, --side <side>", "buy or sell", (val, prev) => {
      if (prev !== undefined) { error("--side specified multiple times", "INVALID_ARGS"); process.exit(1); }
      return val;
    })
    .requiredOption("-t, --token <address>", "Token address")
    .option("--usdc <amount>", "USDC to spend (Base buy orders)")
    .option("--sol <amount>", "SOL to spend (Solana buy orders)")
    .option("--quantity <amount>", "Token quantity to sell (Base sell orders)")
    .option("--percent <pct>", "Percent of position to sell (Solana sell orders, 0.01-100)")
    .option("--note <text>", "Trade note")
    .addHelpText("after", "\nExamples:\n  fomolt paper trade -c base -s buy -t <address> --usdc 500\n  fomolt paper trade -c solana -s sell -t <mint> --percent 50")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      validateSide(opts.side);
      validateAddress(opts.token, chain);
      if (chain === "base" && opts.sol) {
        error("Use --usdc for Base buys, --sol is for Solana", "WRONG_CHAIN_FLAG");
        process.exit(1);
      }
      if (chain === "solana" && opts.usdc) {
        error("Use --sol for Solana buys, --usdc is for Base", "WRONG_CHAIN_FLAG");
        process.exit(1);
      }
      if (chain === "solana" && opts.quantity) {
        error("Use --percent for Solana sells (0.01-100), --quantity is for Base only", "WRONG_CHAIN_FLAG");
        process.exit(1);
      }
      if (chain === "base" && opts.percent) {
        error("Use --quantity for Base sells, --percent is for Solana only", "WRONG_CHAIN_FLAG");
        process.exit(1);
      }
      if (opts.side === "buy" && chain === "base" && !opts.usdc) {
        error("--usdc is required for Base buy orders", "INVALID_ARGS");
        process.exit(1);
      }
      if (opts.side === "buy" && chain === "solana" && !opts.sol) {
        error("--sol is required for Solana buy orders", "INVALID_ARGS");
        process.exit(1);
      }
      if (opts.side === "sell" && chain === "base" && !opts.quantity) {
        error("--quantity is required for Base sell orders", "INVALID_ARGS");
        process.exit(1);
      }
      if (opts.side === "sell" && chain === "solana" && !opts.percent) {
        error("--percent is required for Solana sell orders", "INVALID_ARGS");
        process.exit(1);
      }
      if (opts.usdc) validatePositiveNumber(opts.usdc, "--usdc");
      if (opts.sol) {
        const solAmt = validatePositiveNumber(opts.sol, "--sol");
        if (chain === "solana") validateSolanaMinTrade(solAmt);
      }
      if (opts.quantity) validatePositiveNumber(opts.quantity, "--quantity");
      if (opts.percent) {
        const pct = Number(opts.percent);
        if (isNaN(pct) || pct < 0.01 || pct > 100) {
          error("--percent must be between 0.01 and 100", "INVALID_AMOUNT");
          process.exit(1);
        }
      }
      if (opts.note) validateNote(opts.note);
      return handlePaperTrade({ ...opts, chain }, getContext());
    });

  cmd
    .command("portfolio")
    .description("View paper portfolio and positions")
    .requiredOption("-c, --chain <chain>", "Chain: base or solana")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      return handlePaperPortfolio({ chain }, getContext());
    });

  cmd
    .command("trades")
    .description("View paper trade history")
    .requiredOption("-c, --chain <chain>", "Chain: base or solana")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("-n, --limit <n>", "Max results (1-100)")
    .option("-t, --token <address>", "Filter by token")
    .option("-s, --side <side>", "Filter by side (buy/sell)")
    .option("--start-date <date>", "Filter from ISO datetime")
    .option("--end-date <date>", "Filter to ISO datetime")
    .option("--sort <order>", "Sort order (asc/desc)")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      if (opts.limit) validateLimit(opts.limit);
      if (opts.token) validateAddress(opts.token, chain);
      const startDate = opts.startDate ? normalizeDate(opts.startDate, "--start-date") : undefined;
      const endDate = opts.endDate ? normalizeDate(opts.endDate, "--end-date", true) : undefined;
      const addrField = chain === "base" ? "contractAddress" : "mintAddress";
      return handlePaperTrades(
        {
          chain,
          cursor: opts.cursor,
          limit: opts.limit,
          [addrField]: opts.token,
          side: opts.side,
          startDate,
          endDate,
          sort: opts.sort,
        },
        getContext()
      );
    });

  cmd
    .command("performance")
    .description("View paper performance metrics")
    .requiredOption("-c, --chain <chain>", "Chain: base or solana")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      return handlePaperPerformance({ chain }, getContext());
    });

  cmd
    .command("pnl-image")
    .description("Generate PnL card image for a position")
    .requiredOption("-c, --chain <chain>", "Chain: base or solana")
    .requiredOption("-t, --token <address>", "Token contract address")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      if (chain !== "base") {
        error("pnl-image is only available on Base", "INVALID_CHAIN");
        process.exit(1);
      }
      return handlePaperPnlImage({ token: validateTokenAddress(opts.token) }, getContext());
    });

  return cmd;
}
