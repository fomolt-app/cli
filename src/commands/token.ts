import { Command } from "commander";
import type { CmdContext } from "../context";
import { validateChain, validateAddress, validatePositiveNumber, validateLimit, validateSort, validateOrder, validateTokenWalletSort, validatePeriod, validateMarket } from "../validate";
import { handleLiveTokens, handleLiveTokenInfo, handleLivePrice, handleLiveHolders, handleLiveTokenTrades, handleLiveTokenWallets } from "./live";
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

  return cmd;
}
