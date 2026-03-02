import { test, expect, beforeEach, afterEach, mock, describe } from "bun:test";
import {
  validateInt,
  validatePositiveNumber,
  validateLimit,
  validateTokenAddress,
  validateSlippage,
  validateChain,
  validateSolanaAddress,
  validateAddress,
  validateMarket,
} from "../src/validate";

let stderr: string[] = [];
let exitCode: number | undefined;
const originalStderrWrite = process.stderr.write;
const originalExit = process.exit;

beforeEach(() => {
  stderr = [];
  exitCode = undefined;
  process.stderr.write = ((chunk: string) => {
    stderr.push(chunk);
    return true;
  }) as any;
  process.exit = ((code?: number) => {
    exitCode = code;
    throw new Error("EXIT");
  }) as never;
});

afterEach(() => {
  process.stderr.write = originalStderrWrite;
  process.exit = originalExit;
});

function expectError(fn: () => void, expectedCode?: string): any {
  try {
    fn();
    throw new Error("expected exit");
  } catch (e: any) {
    expect(e.message).toBe("EXIT");
  }
  expect(exitCode).toBe(1);
  const out = JSON.parse(stderr.join(""));
  expect(out.ok).toBe(false);
  if (expectedCode) expect(out.code).toBe(expectedCode);
  return out;
}

// --- validateInt ---
describe("validateInt", () => {
  test("valid integer in range", () => {
    expect(validateInt("10", "--interval", 1, 3600)).toBe(10);
  });

  test("boundary min", () => {
    expect(validateInt("1", "--interval", 1, 3600)).toBe(1);
  });

  test("boundary max", () => {
    expect(validateInt("3600", "--interval", 1, 3600)).toBe(3600);
  });

  test("NaN input", () => {
    expectError(() => validateInt("abc", "--interval", 1, 3600), "INVALID_AMOUNT");
  });

  test("float input", () => {
    expectError(() => validateInt("3.5", "--interval", 1, 3600), "INVALID_AMOUNT");
  });

  test("below min", () => {
    expectError(() => validateInt("0", "--interval", 1, 3600), "INVALID_AMOUNT");
  });

  test("above max", () => {
    expectError(() => validateInt("3601", "--interval", 1, 3600), "INVALID_AMOUNT");
  });

  test("empty string", () => {
    expectError(() => validateInt("", "--interval", 1, 3600), "INVALID_AMOUNT");
  });

  test("negative number", () => {
    expectError(() => validateInt("-5", "--interval", 1, 3600), "INVALID_AMOUNT");
  });

  test("string NaN", () => {
    expectError(() => validateInt("NaN", "--interval", 1, 3600), "INVALID_AMOUNT");
  });
});

// --- validatePositiveNumber ---
describe("validatePositiveNumber", () => {
  test("valid integer", () => {
    expect(validatePositiveNumber("100", "--usdc")).toBe(100);
  });

  test("valid float", () => {
    expect(validatePositiveNumber("12.5", "--usdc")).toBe(12.5);
  });

  test("zero", () => {
    expectError(() => validatePositiveNumber("0", "--usdc"), "INVALID_AMOUNT");
  });

  test("negative", () => {
    expectError(() => validatePositiveNumber("-10", "--usdc"), "INVALID_AMOUNT");
  });

  test("NaN", () => {
    expectError(() => validatePositiveNumber("xyz", "--usdc"), "INVALID_AMOUNT");
  });

  test("empty string", () => {
    expectError(() => validatePositiveNumber("", "--usdc"), "INVALID_AMOUNT");
  });

  test("Infinity", () => {
    expectError(() => validatePositiveNumber("Infinity", "--usdc"), "INVALID_AMOUNT");
  });

  test("-Infinity", () => {
    expectError(() => validatePositiveNumber("-Infinity", "--usdc"), "INVALID_AMOUNT");
  });

  test("zero as 0.0", () => {
    expectError(() => validatePositiveNumber("0.0", "--usdc"), "INVALID_AMOUNT");
  });

  test("negative zero", () => {
    expectError(() => validatePositiveNumber("-0", "--usdc"), "INVALID_AMOUNT");
  });
});

// --- validateLimit ---
describe("validateLimit", () => {
  test("valid limit returns string", () => {
    expect(validateLimit("50")).toBe("50");
  });

  test("boundary 1", () => {
    expect(validateLimit("1")).toBe("1");
  });

  test("boundary 100", () => {
    expect(validateLimit("100")).toBe("100");
  });

  test("zero", () => {
    expectError(() => validateLimit("0"), "INVALID_AMOUNT");
  });

  test("101", () => {
    expectError(() => validateLimit("101"), "INVALID_AMOUNT");
  });

  test("non-integer", () => {
    expectError(() => validateLimit("abc"), "INVALID_AMOUNT");
  });
});

// --- validateTokenAddress ---
describe("validateTokenAddress", () => {
  test("valid address", () => {
    const addr = "0x4200000000000000000000000000000000000006";
    expect(validateTokenAddress(addr)).toBe(addr);
  });

  test("missing 0x prefix", () => {
    expectError(() =>
      validateTokenAddress("4200000000000000000000000000000000000006"),
      "INVALID_ADDRESS"
    );
  });

  test("too short", () => {
    expectError(() => validateTokenAddress("0x1234"), "INVALID_ADDRESS");
  });

  test("too long", () => {
    expectError(() =>
      validateTokenAddress("0x42000000000000000000000000000000000000060"),
      "INVALID_ADDRESS"
    );
  });

  test("invalid chars", () => {
    expectError(() =>
      validateTokenAddress("0xZZZZ000000000000000000000000000000000006"),
      "INVALID_ADDRESS"
    );
  });

  test("random text", () => {
    expectError(() => validateTokenAddress("not-an-address"), "INVALID_ADDRESS");
  });

  test("bare 0x prefix", () => {
    expectError(() => validateTokenAddress("0x"), "INVALID_ADDRESS");
  });

  test("custom flag name in error", () => {
    const out = expectError(() =>
      validateTokenAddress("bad", "--to"),
      "INVALID_ADDRESS"
    );
    expect(out.error).toContain("--to");
  });
});

// --- validateSlippage ---
describe("validateSlippage", () => {
  test("valid slippage returns string", () => {
    expect(validateSlippage("0.5")).toBe("0.5");
  });

  test("boundary 50", () => {
    expect(validateSlippage("50")).toBe("50");
  });

  test("zero", () => {
    expectError(() => validateSlippage("0"), "INVALID_SLIPPAGE");
  });

  test("negative", () => {
    expectError(() => validateSlippage("-1"), "INVALID_SLIPPAGE");
  });

  test("above 50", () => {
    expectError(() => validateSlippage("51"), "INVALID_SLIPPAGE");
  });

  test("NaN", () => {
    expectError(() => validateSlippage("bad"), "INVALID_SLIPPAGE");
  });

  test("Infinity", () => {
    expectError(() => validateSlippage("Infinity"), "INVALID_SLIPPAGE");
  });

  test("small positive value", () => {
    expect(validateSlippage("0.001")).toBe("0.001");
  });
});

// --- validateChain ---
describe("validateChain", () => {
  test("base is valid", () => {
    expect(validateChain("base")).toBe("base");
  });

  test("solana is valid", () => {
    expect(validateChain("solana")).toBe("solana");
  });

  test("ethereum is invalid", () => {
    expectError(() => validateChain("ethereum"), "INVALID_CHAIN");
  });

  test("empty string is invalid", () => {
    expectError(() => validateChain(""), "INVALID_CHAIN");
  });

  test("uppercase BASE is invalid", () => {
    expectError(() => validateChain("BASE"), "INVALID_CHAIN");
  });
});

// --- validateSolanaAddress ---
describe("validateSolanaAddress", () => {
  test("valid 44-char address", () => {
    const addr = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    expect(validateSolanaAddress(addr)).toBe(addr);
  });

  test("valid 32-char address", () => {
    const addr = "11111111111111111111111111111111";
    expect(validateSolanaAddress(addr)).toBe(addr);
  });

  test("too short (31 chars)", () => {
    expectError(() =>
      validateSolanaAddress("1111111111111111111111111111111"),
      "INVALID_ADDRESS"
    );
  });

  test("too long (45 chars)", () => {
    expectError(() =>
      validateSolanaAddress("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1vX"),
      "INVALID_ADDRESS"
    );
  });

  test("contains 0 (invalid base58)", () => {
    expectError(() =>
      validateSolanaAddress("EPjFWdd5AufqSSqeM2qN1xzybapC8G40EGGkZwyTDt1v"),
      "INVALID_ADDRESS"
    );
  });

  test("contains O (invalid base58)", () => {
    expectError(() =>
      validateSolanaAddress("EPjFWdd5AufqSSqeM2qN1xzybapC8G4OEGGkZwyTDt1v"),
      "INVALID_ADDRESS"
    );
  });

  test("contains I (invalid base58)", () => {
    expectError(() =>
      validateSolanaAddress("EPjFWdd5AufqSSqeM2qN1xzybapC8G4IEGGkZwyTDt1v"),
      "INVALID_ADDRESS"
    );
  });

  test("contains l (invalid base58)", () => {
    expectError(() =>
      validateSolanaAddress("EPjFWdd5AufqSSqeM2qN1xzybapC8G4lEGGkZwyTDt1v"),
      "INVALID_ADDRESS"
    );
  });

  test("0x address rejected", () => {
    expectError(() =>
      validateSolanaAddress("0x4200000000000000000000000000000000000006"),
      "INVALID_ADDRESS"
    );
  });

  test("custom flag name in error", () => {
    const out = expectError(() =>
      validateSolanaAddress("bad", "--mint"),
      "INVALID_ADDRESS"
    );
    expect(out.error).toContain("--mint");
  });
});

// --- validateAddress ---
describe("validateAddress", () => {
  test("validates 0x address for base chain", () => {
    const addr = "0x4200000000000000000000000000000000000006";
    expect(validateAddress(addr, "base")).toBe(addr);
  });

  test("validates Solana address for solana chain", () => {
    const addr = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    expect(validateAddress(addr, "solana")).toBe(addr);
  });

  test("rejects Solana address for base chain", () => {
    expectError(() =>
      validateAddress("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "base"),
      "INVALID_ADDRESS"
    );
  });

  test("rejects 0x address for solana chain", () => {
    expectError(() =>
      validateAddress("0x4200000000000000000000000000000000000006", "solana"),
      "INVALID_ADDRESS"
    );
  });
});

// --- validateMarket ---
describe("validateMarket", () => {
  test("paper is valid", () => {
    expect(validateMarket("paper")).toBe("paper");
  });

  test("live is valid", () => {
    expect(validateMarket("live")).toBe("live");
  });

  test("invalid value rejects", () => {
    expectError(() => validateMarket("sandbox"), "INVALID_MARKET");
  });

  test("empty string rejects", () => {
    expectError(() => validateMarket(""), "INVALID_MARKET");
  });
});
