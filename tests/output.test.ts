import { test, expect, beforeEach, afterEach } from "bun:test";
import { success, error } from "../src/output";

let stdout: string[] = [];
let stderr: string[] = [];
const originalWrite = process.stdout.write;
const originalErrWrite = process.stderr.write;

beforeEach(() => {
  stdout = [];
  stderr = [];
  process.stdout.write = ((chunk: string) => {
    stdout.push(chunk);
    return true;
  }) as any;
  process.stderr.write = ((chunk: string) => {
    stderr.push(chunk);
    return true;
  }) as any;
});

afterEach(() => {
  process.stdout.write = originalWrite;
  process.stderr.write = originalErrWrite;
});

test("success outputs JSON to stdout", () => {
  success({ balance: "1000" });
  const output = JSON.parse(stdout.join(""));
  expect(output).toEqual({ ok: true, data: { balance: "1000" } });
});

test("error outputs JSON to stderr", () => {
  error("Not found", "NOT_FOUND");
  const output = JSON.parse(stderr.join(""));
  expect(output).toEqual({ ok: false, error: "Not found", code: "NOT_FOUND" });
});

test("error with extra fields", () => {
  error("Rate limited", "RATE_LIMITED", { retryAfter: 45 });
  const output = JSON.parse(stderr.join(""));
  expect(output).toEqual({
    ok: false,
    error: "Rate limited",
    code: "RATE_LIMITED",
    retryAfter: 45,
  });
});
