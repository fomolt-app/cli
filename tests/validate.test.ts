import { test, expect, beforeEach, afterEach, mock, describe } from "bun:test";
import {
  validateInt,
  validatePositiveNumber,
  validateLimit,
  validateTokenAddress,
  validateSlippage,
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

function expectValidationError(fn: () => void): any {
  try {
    fn();
    throw new Error("expected exit");
  } catch (e: any) {
    expect(e.message).toBe("EXIT");
  }
  expect(exitCode).toBe(1);
  const out = JSON.parse(stderr.join(""));
  expect(out.ok).toBe(false);
  expect(out.code).toBe("VALIDATION_ERROR");
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
    expectValidationError(() => validateInt("abc", "--interval", 1, 3600));
  });

  test("float input", () => {
    expectValidationError(() => validateInt("3.5", "--interval", 1, 3600));
  });

  test("below min", () => {
    expectValidationError(() => validateInt("0", "--interval", 1, 3600));
  });

  test("above max", () => {
    expectValidationError(() => validateInt("3601", "--interval", 1, 3600));
  });

  test("empty string", () => {
    expectValidationError(() => validateInt("", "--interval", 1, 3600));
  });

  test("negative number", () => {
    expectValidationError(() => validateInt("-5", "--interval", 1, 3600));
  });

  test("string NaN", () => {
    expectValidationError(() => validateInt("NaN", "--interval", 1, 3600));
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
    expectValidationError(() => validatePositiveNumber("0", "--usdc"));
  });

  test("negative", () => {
    expectValidationError(() => validatePositiveNumber("-10", "--usdc"));
  });

  test("NaN", () => {
    expectValidationError(() => validatePositiveNumber("xyz", "--usdc"));
  });

  test("empty string", () => {
    expectValidationError(() => validatePositiveNumber("", "--usdc"));
  });

  test("Infinity", () => {
    expectValidationError(() => validatePositiveNumber("Infinity", "--usdc"));
  });

  test("-Infinity", () => {
    expectValidationError(() => validatePositiveNumber("-Infinity", "--usdc"));
  });

  test("zero as 0.0", () => {
    expectValidationError(() => validatePositiveNumber("0.0", "--usdc"));
  });

  test("negative zero", () => {
    expectValidationError(() => validatePositiveNumber("-0", "--usdc"));
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
    expectValidationError(() => validateLimit("0"));
  });

  test("101", () => {
    expectValidationError(() => validateLimit("101"));
  });

  test("non-integer", () => {
    expectValidationError(() => validateLimit("abc"));
  });
});

// --- validateTokenAddress ---
describe("validateTokenAddress", () => {
  test("valid address", () => {
    const addr = "0x4200000000000000000000000000000000000006";
    expect(validateTokenAddress(addr)).toBe(addr);
  });

  test("missing 0x prefix", () => {
    expectValidationError(() =>
      validateTokenAddress("4200000000000000000000000000000000000006")
    );
  });

  test("too short", () => {
    expectValidationError(() => validateTokenAddress("0x1234"));
  });

  test("too long", () => {
    expectValidationError(() =>
      validateTokenAddress("0x42000000000000000000000000000000000000060")
    );
  });

  test("invalid chars", () => {
    expectValidationError(() =>
      validateTokenAddress("0xZZZZ000000000000000000000000000000000006")
    );
  });

  test("random text", () => {
    expectValidationError(() => validateTokenAddress("not-an-address"));
  });

  test("bare 0x prefix", () => {
    expectValidationError(() => validateTokenAddress("0x"));
  });

  test("custom flag name in error", () => {
    const out = expectValidationError(() =>
      validateTokenAddress("bad", "--to")
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
    expectValidationError(() => validateSlippage("0"));
  });

  test("negative", () => {
    expectValidationError(() => validateSlippage("-1"));
  });

  test("above 50", () => {
    expectValidationError(() => validateSlippage("51"));
  });

  test("NaN", () => {
    expectValidationError(() => validateSlippage("bad"));
  });

  test("Infinity", () => {
    expectValidationError(() => validateSlippage("Infinity"));
  });

  test("small positive value", () => {
    expect(validateSlippage("0.001")).toBe("0.001");
  });
});
