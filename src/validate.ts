import { error } from "./output";

export function validateInt(
  value: string,
  flag: string,
  min: number,
  max: number
): number {
  const n = parseInt(value, 10);
  if (!Number.isInteger(n) || String(n) !== value.trim()) {
    error(`${flag} must be an integer, got "${value}"`, "VALIDATION_ERROR");
    process.exit(1);
  }
  if (n < min || n > max) {
    error(
      `${flag} must be between ${min} and ${max}, got ${n}`,
      "VALIDATION_ERROR"
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
      "VALIDATION_ERROR"
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
      "VALIDATION_ERROR"
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
      "VALIDATION_ERROR"
    );
    process.exit(1);
  }
  return value;
}
