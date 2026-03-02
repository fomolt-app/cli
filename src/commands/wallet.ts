import { Command } from "commander";
import { error } from "../output";
import type { CmdContext } from "../context";
import { validateChain, validateAddress, validateLimit, validateWalletMode, validateWalletSort, validatePeriod } from "../validate";
import { handleLiveWallet, handleLiveTopWallets } from "./live";

export function walletCommands(getContext: () => CmdContext): Command {
  const cmd = new Command("wallet")
    .description("Wallet analytics (both chains)");

  cmd
    .option("-c, --chain <chain>", "Chain: base or solana")
    .option("--address <address>", "Wallet address")
    .option("--mode <mode>", "Mode: stats, trades, chart, balances", "stats")
    .option("--limit <n>", "Max results for trades/balances (1-100)", "25")
    .option("--cursor <cursor>", "Pagination cursor (trades/balances)")
    .option("--token <address>", "Filter trades by token address")
    .option("--resolution <res>", "Chart resolution (e.g. 1D, 1H)", "1D")
    .option("--start <timestamp>", "Chart start unix timestamp")
    .option("--end <timestamp>", "Chart end unix timestamp")
    .action(async (opts) => {
      if (!opts.chain) {
        error("required option '--chain <chain>' not specified", "INVALID_ARGS");
        process.exit(1);
      }
      if (!opts.address) {
        error("required option '--address <address>' not specified", "INVALID_ARGS");
        process.exit(1);
      }
      const chain = validateChain(opts.chain);
      validateAddress(opts.address, chain, "--address");
      if (opts.mode) validateWalletMode(opts.mode);
      if (opts.mode === "trades" || opts.mode === "balances") {
        validateLimit(opts.limit);
      }
      if (opts.token) validateAddress(opts.token, chain, "--token");
      return handleLiveWallet({ ...opts, chain }, getContext());
    });

  cmd
    .command("top")
    .description("Discover top-performing wallets")
    .option("--sort <field>", "Sort by: pnl, volume, win-rate", "pnl")
    .option("--period <period>", "Time period: 1d, 1w, 30d, 1y", "30d")
    .option("--limit <n>", "Max results (1-100)", "20")
    .option("--offset <n>", "Offset for pagination", "0")
    .action(async function (opts) {
      // --chain is parsed by the parent wallet command; read it from there
      const parentChain = this.parent.opts().chain;
      if (!parentChain) {
        error("required option '--chain <chain>' not specified", "INVALID_ARGS");
        process.exit(1);
      }
      const chain = validateChain(parentChain);
      if (opts.sort) validateWalletSort(opts.sort);
      if (opts.period) validatePeriod(opts.period);
      validateLimit(opts.limit);
      return handleLiveTopWallets({ chain, sort: opts.sort, period: opts.period, limit: opts.limit, offset: opts.offset }, getContext());
    });

  return cmd;
}
