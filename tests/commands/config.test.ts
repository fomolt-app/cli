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

test("config set writes value and config get reads it", async () => {
  const { handleConfigSet, handleConfigGet } = await import(
    "../../src/commands/config"
  );

  await handleConfigSet("apiUrl", "https://custom.com", testDir);
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
