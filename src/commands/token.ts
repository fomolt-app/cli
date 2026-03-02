import { Command } from "commander";
import { error as cliError } from "../output";
import type { CmdContext } from "../context";
import { validateChain, validateAddress, validatePositiveNumber, validateLimit, validateSort, validateOrder, validateTokenWalletSort, validatePeriod, validateMarket, validateSparklineResolution, validatePairStatsDurations, validateProposalType } from "../validate";
import { handleLiveTokens, handleLiveTokenInfo, handleLivePrice, handleLiveHolders, handleLiveTokenTrades, handleLiveTokenWallets, handleLiveTopTraders, handleLiveSparklines, handleLivePairStats, handleLiveLiquidityLocks, handleLiveLifecycleEvents, handleLiveTokenPairs, handleLiveCommunityNotes } from "./live";
import { handlePaperPrice } from "./paper";

export function tokenCommands(getContext: () => CmdContext): Command {
  const cmd = new Command("token").description(
    "Token data and analytics (both chains)"
  );

  cmd
    .command("search")
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
      return handleLiveTokens({ ...opts, chain }, getContext(), { tokenInfoCmd: "fomolt token info" });
    });

  cmd
    .command("info")
    .description("Get detailed token overview (price, market cap, volume, holders)")
    .requiredOption("--chain <chain>", "Chain: base or solana")
    .requiredOption("--address <address>", "Token contract address")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      validateAddress(opts.address, chain, "--address");
      return handleLiveTokenInfo({ address: opts.address, chain }, getContext());
    });

  cmd
    .command("price")
    .description("Look up the current price of a token")
    .requiredOption("--chain <chain>", "Chain: base or solana")
    .requiredOption("--token <address>", "Token address")
    .option("--market <market>", "Price source: paper or live", "live")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      validateAddress(opts.token, chain);
      const market = validateMarket(opts.market);
      if (market === "paper") {
        return handlePaperPrice({ token: opts.token, chain }, getContext());
      }
      return handleLivePrice({ token: opts.token, chain }, getContext());
    });

  cmd
    .command("holders")
    .description("Get top token holders with balances")
    .requiredOption("--chain <chain>", "Chain: base or solana")
    .requiredOption("--address <address>", "Token contract address")
    .option("--limit <n>", "Max results (1-100)", "25")
    .option("--cursor <cursor>", "Pagination cursor")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      validateAddress(opts.address, chain, "--address");
      validateLimit(opts.limit);
      return handleLiveHolders({ address: opts.address, chain, limit: opts.limit, cursor: opts.cursor }, getContext());
    });

  cmd
    .command("trades")
    .description("Get recent trade events for a token")
    .requiredOption("--chain <chain>", "Chain: base or solana")
    .requiredOption("--address <address>", "Token contract address")
    .option("--limit <n>", "Max results (1-100)", "25")
    .option("--cursor <cursor>", "Pagination cursor")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      validateAddress(opts.address, chain, "--address");
      validateLimit(opts.limit);
      return handleLiveTokenTrades({ address: opts.address, chain, limit: opts.limit, cursor: opts.cursor }, getContext());
    });

  cmd
    .command("wallets")
    .description("Discover wallets trading a specific token")
    .requiredOption("--chain <chain>", "Chain: base or solana")
    .requiredOption("--address <address>", "Token contract address")
    .option("--sort <field>", "Sort by: pnl, volume", "pnl")
    .option("--period <period>", "Time period: 1d, 1w, 30d, 1y", "30d")
    .option("--limit <n>", "Max results (1-100)", "20")
    .option("--offset <n>", "Offset for pagination", "0")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      validateAddress(opts.address, chain, "--address");
      if (opts.sort) validateTokenWalletSort(opts.sort);
      if (opts.period) validatePeriod(opts.period);
      validateLimit(opts.limit);
      return handleLiveTokenWallets({ address: opts.address, chain, sort: opts.sort, period: opts.period, limit: opts.limit, offset: opts.offset }, getContext());
    });

  cmd
    .command("top-traders")
    .description("Get top traders for a specific token")
    .requiredOption("--chain <chain>", "Chain: base or solana")
    .requiredOption("--address <address>", "Token contract address")
    .option("--period <period>", "Time period: 1d, 1w, 30d, 1y", "30d")
    .option("--limit <n>", "Max results (1-100)", "25")
    .option("--offset <n>", "Offset for pagination", "0")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      validateAddress(opts.address, chain, "--address");
      if (opts.period) validatePeriod(opts.period);
      validateLimit(opts.limit);
      return handleLiveTopTraders({ address: opts.address, chain, period: opts.period, limit: opts.limit, offset: opts.offset }, getContext());
    });

  cmd
    .command("sparklines")
    .description("Get sparkline price data for a token")
    .requiredOption("--chain <chain>", "Chain: base or solana")
    .requiredOption("--address <address>", "Token contract address")
    .option("--resolution <res>", "Candle resolution (1S, 5S, 15S, 30S, 1, 5, 15, 30, 60, 240, 720, 1D, 7D)", "60")
    .option("--from <timestamp>", "Start unix timestamp")
    .option("--to <timestamp>", "End unix timestamp")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      validateAddress(opts.address, chain, "--address");
      if (opts.resolution) validateSparklineResolution(opts.resolution);
      return handleLiveSparklines({ address: opts.address, chain, resolution: opts.resolution, from: opts.from, to: opts.to }, getContext());
    });

  cmd
    .command("pair-stats")
    .description("Get detailed statistics for a trading pair")
    .requiredOption("--chain <chain>", "Chain: base or solana")
    .requiredOption("--pair-address <address>", "Pair contract address")
    .option("--durations <list>", "Comma-separated durations: 5m, 15m, 1h, 4h, 12h, 1d, 1w, 30d", "1d")
    .option("--bucket-count <n>", "Number of time buckets")
    .option("--token-of-interest <token>", "Token perspective: token0 or token1")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      validateAddress(opts.pairAddress, chain, "--pair-address");
      if (opts.durations) validatePairStatsDurations(opts.durations);
      if (opts.tokenOfInterest && opts.tokenOfInterest !== "token0" && opts.tokenOfInterest !== "token1") {
        cliError('--token-of-interest must be "token0" or "token1"', "INVALID_ARGS");
        process.exit(1);
      }
      return handleLivePairStats({ pairAddress: opts.pairAddress, chain, durations: opts.durations, bucketCount: opts.bucketCount, tokenOfInterest: opts.tokenOfInterest }, getContext());
    });

  cmd
    .command("liquidity-locks")
    .description("Get liquidity lock data for a token or pair")
    .requiredOption("--chain <chain>", "Chain: base or solana")
    .option("--pair-address <address>", "Pair contract address")
    .option("--token-address <address>", "Token contract address")
    .option("--cursor <cursor>", "Pagination cursor")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      if (!opts.pairAddress && !opts.tokenAddress) {
        cliError("Either --pair-address or --token-address is required", "INVALID_ARGS");
        process.exit(1);
      }
      if (opts.pairAddress) validateAddress(opts.pairAddress, chain, "--pair-address");
      if (opts.tokenAddress) validateAddress(opts.tokenAddress, chain, "--token-address");
      return handleLiveLiquidityLocks({ chain, pairAddress: opts.pairAddress, tokenAddress: opts.tokenAddress, cursor: opts.cursor }, getContext());
    });

  cmd
    .command("lifecycle")
    .description("Get mint/burn lifecycle events for a token")
    .requiredOption("--chain <chain>", "Chain: base or solana")
    .requiredOption("--address <address>", "Token contract address")
    .option("--limit <n>", "Max results (1-100)", "25")
    .option("--cursor <cursor>", "Pagination cursor")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      validateAddress(opts.address, chain, "--address");
      validateLimit(opts.limit);
      return handleLiveLifecycleEvents({ address: opts.address, chain, limit: opts.limit, cursor: opts.cursor }, getContext());
    });

  cmd
    .command("pairs")
    .description("List trading pairs for a token with metadata")
    .requiredOption("--chain <chain>", "Chain: base or solana")
    .requiredOption("--address <address>", "Token contract address")
    .option("--limit <n>", "Max results (1-100)", "25")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      validateAddress(opts.address, chain, "--address");
      validateLimit(opts.limit);
      return handleLiveTokenPairs({ address: opts.address, chain, limit: opts.limit }, getContext());
    });

  cmd
    .command("community-notes")
    .description("Get community reports (scam flags, logo changes) for tokens")
    .option("--chain <chain>", "Chain: base or solana")
    .option("--address <address>", "Token contract address")
    .option("--proposal-type <type>", "Filter by type: SCAM, LOGO, ATTRIBUTE")
    .option("--limit <n>", "Max results (1-100)", "25")
    .option("--cursor <cursor>", "Pagination cursor")
    .action(async (opts) => {
      let chain: "base" | "solana" | undefined;
      if (opts.chain) chain = validateChain(opts.chain);
      if (opts.address) {
        if (!chain) {
          cliError("--chain is required when filtering by --address", "INVALID_ARGS");
          process.exit(1);
        }
        validateAddress(opts.address, chain, "--address");
      }
      if (opts.proposalType) validateProposalType(opts.proposalType);
      validateLimit(opts.limit);
      return handleLiveCommunityNotes({ chain, address: opts.address, proposalType: opts.proposalType, limit: opts.limit, cursor: opts.cursor }, getContext());
    });

  return cmd;
}
