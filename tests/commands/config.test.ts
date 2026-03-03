import { test, expect, beforeEach, afterEach } from "bun:test";
import { tmpdir } from "os";
import { join } from "path";
import { mkdirSync, rmSync } from "fs";
import { saveConfig } from "../../src/config";

let testDir: string;
let stdout: string[] = [];
const originalWrite = process.stdout.write;

beforeEach(() => {
  testDir = join(
    tmpdir(),
    `fomolt-cfg-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  mkdirSync(testDir, { recursive: true });
  stdout = [];
  process.stdout.write = ((chunk: string) => {
    stdout.push(chunk);
    return true;
  }) as any;
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
  process.stdout.write = originalWrite;
});

test("config set writes trusted URL and config get reads it", async () => {
  const { handleConfigSet, handleConfigGet } = await import(
    "../../src/commands/config"
  );

  await handleConfigSet("apiUrl", "https://staging.fomolt.com", testDir);
  const output1 = JSON.parse(stdout.join(""));
  expect(output1.ok).toBe(true);

  stdout = [];
  await handleConfigGet("apiUrl", testDir);
  const output2 = JSON.parse(stdout.join(""));
  expect(output2).toEqual({
    ok: true,
    data: { key: "apiUrl", value: "https://staging.fomolt.com" },
  });
});

test("config set rejects untrusted URL without --force", async () => {
  const { handleConfigSet } = await import("../../src/commands/config");
  const { validateConfigValue } = await import("../../src/config");
  const err = validateConfigValue("apiUrl", "https://evil.com");
  expect(err).toContain("not a trusted fomolt domain");
});

test("config set accepts untrusted URL with --force", async () => {
  const { handleConfigSet, handleConfigGet } = await import(
    "../../src/commands/config"
  );

  await handleConfigSet("apiUrl", "https://custom.com", testDir, true);
  const output1 = JSON.parse(stdout.join(""));
  expect(output1.ok).toBe(true);

  stdout = [];
  await handleConfigGet("apiUrl", testDir);
  const output2 = JSON.parse(stdout.join(""));
  expect(output2).toEqual({
    ok: true,
    data: { key: "apiUrl", value: "https://custom.com" },
  });
});

test("config set rejects http URL for non-local domain", async () => {
  const { validateConfigValue } = await import("../../src/config");
  const err = validateConfigValue("apiUrl", "http://fomolt.com");
  expect(err).toContain("HTTPS");
});

test("config set allows http for localhost", async () => {
  const { validateConfigValue } = await import("../../src/config");
  const err = validateConfigValue("apiUrl", "http://localhost:3000");
  expect(err).toBeNull();
});

test("config list shows all config", async () => {
  const { handleConfigList } = await import("../../src/commands/config");
  await saveConfig(
    { apiUrl: "https://a.com", defaultMarket: "paper" },
    testDir
  );

  await handleConfigList(testDir);
  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.apiUrl).toBe("https://a.com");
  expect(output.data.defaultMarket).toBe("paper");
});

test("config get for missing key returns null", async () => {
  const { handleConfigGet } = await import("../../src/commands/config");

  await handleConfigGet("nonexistent", testDir);
  const output = JSON.parse(stdout.join(""));
  expect(output).toEqual({
    ok: true,
    data: { key: "nonexistent", value: null },
  });
});
