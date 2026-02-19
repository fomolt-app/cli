import { test, expect, beforeEach, afterEach } from "bun:test";
import { tmpdir } from "os";
import { join } from "path";
import { mkdirSync, rmSync, existsSync, statSync } from "fs";
import {
  loadCredentials,
  saveCredentials,
  loadConfig,
  saveConfig,
  type Credentials,
  type Config,
} from "../src/config";

let testDir: string;

beforeEach(() => {
  testDir = join(
    tmpdir(),
    `fomolt-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

test("saveCredentials creates file and loadCredentials reads it", async () => {
  const creds: Credentials = {
    apiKey: "test-key",
    recoveryKey: "test-recovery",
    name: "test_agent",
  };
  await saveCredentials(creds, testDir);
  const loaded = await loadCredentials(testDir);
  expect(loaded).toEqual(creds);
});

test("loadCredentials returns null when no file exists", async () => {
  const loaded = await loadCredentials(testDir);
  expect(loaded).toBeNull();
});

test("saveConfig creates file and loadConfig reads it", async () => {
  const config: Config = { apiUrl: "https://custom.api.com" };
  await saveConfig(config, testDir);
  const loaded = await loadConfig(testDir);
  expect(loaded).toEqual(config);
});

test("loadConfig returns empty object when no file exists", async () => {
  const loaded = await loadConfig(testDir);
  expect(loaded).toEqual({});
});

test("credentials file has restricted permissions", async () => {
  await saveCredentials(
    { apiKey: "k", recoveryKey: "r", name: "n" },
    testDir
  );
  const path = join(testDir, "credentials.json");
  expect(existsSync(path)).toBe(true);
  const stat = statSync(path);
  expect(stat.mode & 0o777).toBe(0o600);
});
