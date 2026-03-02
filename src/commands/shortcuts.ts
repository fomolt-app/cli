import { Command } from "commander";
import { error } from "../output";
import type { CmdContext } from "../context";
import { validatePositiveNumber, validateSlippage, validateChain, validateAddress } from "../validate";
import { handleLiveTrade } from "./live";
import { handlePaperTrade } from "./paper";

export function buyCommand(getContext: () => CmdContext): Command {
  const cmd = new Command("buy")
    .description("Buy a token (shortcut for live/paper trade --side buy)")
    .requiredOption("-c, --chain <chain>", "Chain: base or solana")
    .requiredOption("-t, --token <address>", "Token address")
    .option("--usdc <amount>", "USDC to spend (Base)")
    .option("--sol <amount>", "SOL to spend (Solana)")
    .option("-m, --market <market>", "Market: live or paper", "live")
    .option("--slippage <pct>", "Slippage tolerance %")
    .option("--note <text>", "Trade note")
    .addHelpText("after", "\nExamples:\n  fomolt buy -c solana -t <mint> --sol 0.1\n  fomolt buy -c base -t <address> --usdc 100\n  fomolt buy -c solana -t <mint> --sol 0.5 -m paper")
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
      if (opts.slippage) validateSlippage(opts.slippage);
      const tradeOpts = { side: "buy", token: opts.token, chain, usdc: opts.usdc, sol: opts.sol, slippage: opts.slippage, note: opts.note };
      if (opts.market === "paper") {
        return handlePaperTrade(tradeOpts, getContext());
      }
      return handleLiveTrade(tradeOpts, getContext());
    });

  return cmd;
}

export function sellCommand(getContext: () => CmdContext): Command {
  const cmd = new Command("sell")
    .description("Sell a token (shortcut for live/paper trade --side sell)")
    .requiredOption("-c, --chain <chain>", "Chain: base or solana")
    .requiredOption("-t, --token <address>", "Token address")
    .option("--quantity <amount>", "Token quantity to sell (Base)")
    .option("--percent <pct>", "Percent of holdings to sell, 1-100 (Solana)")
    .option("-m, --market <market>", "Market: live or paper", "live")
    .option("--slippage <pct>", "Slippage tolerance %")
    .option("--note <text>", "Trade note")
    .addHelpText("after", "\nExamples:\n  fomolt sell -c solana -t <mint> --percent 100\n  fomolt sell -c base -t <address> --quantity 5000\n  fomolt sell -c solana -t <mint> --percent 50 -m paper")
    .action(async (opts) => {
      const chain = validateChain(opts.chain);
      validateAddress(opts.token, chain);
      if (opts.quantity && chain === "solana") {
        error("Use --percent for Solana sells, --quantity is for Base only", "WRONG_CHAIN_FLAG");
        process.exit(1);
      }
      if (opts.percent && chain !== "solana") {
        error("Use --quantity for Base sells, --percent is for Solana only", "WRONG_CHAIN_FLAG");
        process.exit(1);
      }
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
      const tradeOpts = { side: "sell", token: opts.token, chain, quantity: opts.quantity, percent: opts.percent, slippage: opts.slippage, note: opts.note };
      if (opts.market === "paper") {
        return handlePaperTrade(tradeOpts, getContext());
      }
      return handleLiveTrade(tradeOpts, getContext());
    });

  return cmd;
}
