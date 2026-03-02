import { error } from "./output";

export type Chain = "base" | "solana";

export function validateChain(value: string): Chain {
  if (value !== "base" && value !== "solana") {
    error(`--chain must be "base" or "solana", got "${value}"`, "INVALID_CHAIN");
    process.exit(1);
  }
  return value;
}

export function validateSolanaAddress(value: string, flag: string = "--token"): string {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) {
    error(`${flag} must be a valid Solana address (32-44 base58 chars), got "${value}"`, "INVALID_ADDRESS");
    process.exit(1);
  }
  return value;
}

export function validateAddress(value: string, chain: Chain, flag: string = "--token"): string {
  return chain === "base" ? validateTokenAddress(value, flag) : validateSolanaAddress(value, flag);
}

export function validateInt(
  value: string,
  flag: string,
  min: number,
  max: number
): number {
  const n = parseInt(value, 10);
  if (!Number.isInteger(n) || String(n) !== value.trim()) {
    error(`${flag} must be an integer, got "${value}"`, "INVALID_AMOUNT");
    process.exit(1);
  }
  if (n < min || n > max) {
    error(
      `${flag} must be between ${min} and ${max}, got ${n}`,
      "INVALID_AMOUNT"
    );
    process.exit(1);
  }
  return n;
}

export function validatePositiveNumber(value: string, flag: string): number {
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n <= 0) {
    error(
      `${flag} must be a positive number, got "${value}"`,
      "INVALID_AMOUNT"
    );
    process.exit(1);
  }
  return n;
}

export function validateLimit(value: string): string {
  validateInt(value, "--limit", 1, 100);
  return value;
}

export function validateTokenAddress(value: string, flag: string = "--token"): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) {
    error(
      `${flag} must be a valid 0x address (42 chars), got "${value}"`,
      "INVALID_ADDRESS"
    );
    process.exit(1);
  }
  return value;
}

export function validateSlippage(value: string): string {
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n <= 0 || n > 50) {
    error(
      `--slippage must be between 0 (exclusive) and 50, got "${value}"`,
      "INVALID_SLIPPAGE"
    );
    process.exit(1);
  }
  return value;
}

export function validateUsername(value: string): string {
  if (!/^[a-zA-Z0-9_]{1,15}$/.test(value)) {
    error(
      `Username must be 1-15 alphanumeric/underscore characters, got "${value}"`,
      "INVALID_USERNAME"
    );
    process.exit(1);
  }
  return value;
}

export function validateTweetId(value: string): string {
  if (!/^\d+$/.test(value)) {
    error(
      `Tweet ID must be numeric, got "${value}"`,
      "INVALID_TWEET_ID"
    );
    process.exit(1);
  }
  return value;
}

const VALID_SORTS = ["trending", "volume", "market_cap", "holders", "created"] as const;

export function validateSort(value: string): string {
  if (!VALID_SORTS.includes(value as any)) {
    error(`--sort must be one of ${VALID_SORTS.join(", ")}, got "${value}"`, "INVALID_SORT");
    process.exit(1);
  }
  return value;
}

export function validateOrder(value: string): string {
  if (value !== "asc" && value !== "desc") {
    error(`--order must be "asc" or "desc", got "${value}"`, "INVALID_ORDER");
    process.exit(1);
  }
  return value;
}

const VALID_WALLET_SORTS = ["pnl", "volume", "win-rate"] as const;
export type WalletSort = (typeof VALID_WALLET_SORTS)[number];

export function validateWalletSort(value: string): WalletSort {
  if (!VALID_WALLET_SORTS.includes(value as WalletSort)) {
    error(`--sort must be one of ${VALID_WALLET_SORTS.join(", ")}, got "${value}"`, "INVALID_SORT");
    process.exit(1);
  }
  return value as WalletSort;
}

const VALID_TOKEN_WALLET_SORTS = ["pnl", "volume"] as const;
export type TokenWalletSort = (typeof VALID_TOKEN_WALLET_SORTS)[number];

export function validateTokenWalletSort(value: string): TokenWalletSort {
  if (!VALID_TOKEN_WALLET_SORTS.includes(value as TokenWalletSort)) {
    error(`--sort must be one of ${VALID_TOKEN_WALLET_SORTS.join(", ")}, got "${value}"`, "INVALID_SORT");
    process.exit(1);
  }
  return value as TokenWalletSort;
}

const VALID_PERIODS = ["1d", "1w", "30d", "1y"] as const;
export type Period = (typeof VALID_PERIODS)[number];

export function validatePeriod(value: string): Period {
  if (!VALID_PERIODS.includes(value as Period)) {
    error(`--period must be one of ${VALID_PERIODS.join(", ")}, got "${value}"`, "INVALID_PERIOD");
    process.exit(1);
  }
  return value as Period;
}

const VALID_WALLET_MODES = ["stats", "trades", "chart", "balances"] as const;
export type WalletMode = (typeof VALID_WALLET_MODES)[number];

export function validateWalletMode(value: string): WalletMode {
  if (!VALID_WALLET_MODES.includes(value as WalletMode)) {
    error(`--mode must be one of ${VALID_WALLET_MODES.join(", ")}, got "${value}"`, "INVALID_MODE");
    process.exit(1);
  }
  return value as WalletMode;
}

export type Market = "paper" | "live";

export function validateMarket(value: string): Market {
  if (value !== "paper" && value !== "live") {
    error(`--market must be "paper" or "live", got "${value}"`, "INVALID_MARKET");
    process.exit(1);
  }
  return value;
}

export function validateQuery(value: string): string {
  if (value.length === 0 || value.length > 500) {
    error(
      `--query must be 1-500 characters, got ${value.length}`,
      "INVALID_QUERY"
    );
    process.exit(1);
  }
  return value;
}
