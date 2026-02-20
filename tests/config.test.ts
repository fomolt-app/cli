import { test, expect, beforeEach, afterEach } from "bun:test";
import { tmpdir } from "os";
import { join } from "path";
import { mkdirSync, rmSync, existsSync, statSync } from "fs";
import {
  loadCredentials,
  saveCredentials,
  loadCredentialsStore,
  saveCredentialsStore,
  switchAgent,
  removeAgent,
  listAgents,
  loadConfig,
  saveConfig,
  type Credentials,
  type CredentialsStore,
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

test("loadCredentials reads legacy nested format", async () => {
  const legacy = {
    driftwood: {
      apiKey: "fml_legacy_key",
      username: "driftwood",
      recoveryKey: "rec_legacy",
    },
  };
  const path = join(testDir, "credentials.json");
  await Bun.write(path, JSON.stringify(legacy));
  const loaded = await loadCredentials(testDir);
  expect(loaded).not.toBeNull();
  expect(loaded!.apiKey).toBe("fml_legacy_key");
  expect(loaded!.name).toBe("driftwood");
  expect(loaded!.recoveryKey).toBe("rec_legacy");
});

test("loadCredentials returns null for unrecognized format", async () => {
  const path = join(testDir, "credentials.json");
  await Bun.write(path, JSON.stringify({ random: "stuff", foo: "bar" }));
  const loaded = await loadCredentials(testDir);
  expect(loaded).toBeNull();
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

test("loadCredentials returns null for corrupted JSON file", async () => {
  const path = join(testDir, "credentials.json");
  await Bun.write(path, "{ not valid json !!!");
  const loaded = await loadCredentials(testDir);
  expect(loaded).toBeNull();
});

// --- Multi-agent store tests ---

test("saveCredentials writes v2 store format", async () => {
  await saveCredentials(
    { apiKey: "k1", recoveryKey: "r1", name: "alpha" },
    testDir
  );
  const raw = await Bun.file(join(testDir, "credentials.json")).json();
  expect(raw.version).toBe(2);
  expect(raw.activeAgent).toBe("alpha");
  expect(raw.agents.alpha.apiKey).toBe("k1");
});

test("saveCredentials twice stores both agents", async () => {
  await saveCredentials(
    { apiKey: "k1", recoveryKey: "r1", name: "alpha" },
    testDir
  );
  await saveCredentials(
    { apiKey: "k2", recoveryKey: "r2", name: "beta" },
    testDir
  );
  const store = await loadCredentialsStore(testDir);
  expect(store).not.toBeNull();
  expect(Object.keys(store!.agents)).toEqual(["alpha", "beta"]);
  expect(store!.activeAgent).toBe("beta");
});

test("loadCredentials with agentName returns specific agent", async () => {
  await saveCredentials(
    { apiKey: "k1", recoveryKey: "r1", name: "alpha" },
    testDir
  );
  await saveCredentials(
    { apiKey: "k2", recoveryKey: "r2", name: "beta" },
    testDir
  );
  const creds = await loadCredentials(testDir, "alpha");
  expect(creds).not.toBeNull();
  expect(creds!.name).toBe("alpha");
  expect(creds!.apiKey).toBe("k1");
});

test("loadCredentials without agentName returns active agent", async () => {
  await saveCredentials(
    { apiKey: "k1", recoveryKey: "r1", name: "alpha" },
    testDir
  );
  await saveCredentials(
    { apiKey: "k2", recoveryKey: "r2", name: "beta" },
    testDir
  );
  const creds = await loadCredentials(testDir);
  expect(creds!.name).toBe("beta");
});

test("loadCredentials returns null for nonexistent agent name", async () => {
  await saveCredentials(
    { apiKey: "k1", recoveryKey: "r1", name: "alpha" },
    testDir
  );
  const creds = await loadCredentials(testDir, "nonexistent");
  expect(creds).toBeNull();
});

test("switchAgent changes active agent", async () => {
  await saveCredentials(
    { apiKey: "k1", recoveryKey: "r1", name: "alpha" },
    testDir
  );
  await saveCredentials(
    { apiKey: "k2", recoveryKey: "r2", name: "beta" },
    testDir
  );
  const result = await switchAgent("alpha", testDir);
  expect(result).toBe(true);
  const store = await loadCredentialsStore(testDir);
  expect(store!.activeAgent).toBe("alpha");
});

test("switchAgent returns false for nonexistent agent", async () => {
  await saveCredentials(
    { apiKey: "k1", recoveryKey: "r1", name: "alpha" },
    testDir
  );
  const result = await switchAgent("nonexistent", testDir);
  expect(result).toBe(false);
});

test("removeAgent deletes agent from store", async () => {
  await saveCredentials(
    { apiKey: "k1", recoveryKey: "r1", name: "alpha" },
    testDir
  );
  await saveCredentials(
    { apiKey: "k2", recoveryKey: "r2", name: "beta" },
    testDir
  );
  const result = await removeAgent("beta", testDir);
  expect(result).toBe(true);
  const store = await loadCredentialsStore(testDir);
  expect(Object.keys(store!.agents)).toEqual(["alpha"]);
  expect(store!.activeAgent).toBe("alpha");
});

test("removeAgent auto-selects remaining agent when active removed", async () => {
  await saveCredentials(
    { apiKey: "k1", recoveryKey: "r1", name: "alpha" },
    testDir
  );
  await saveCredentials(
    { apiKey: "k2", recoveryKey: "r2", name: "beta" },
    testDir
  );
  // beta is active; removing it should auto-select alpha
  const result = await removeAgent("beta", testDir);
  expect(result).toBe(true);
  const store = await loadCredentialsStore(testDir);
  expect(store!.activeAgent).toBe("alpha");
});

test("removeAgent returns false for nonexistent agent", async () => {
  await saveCredentials(
    { apiKey: "k1", recoveryKey: "r1", name: "alpha" },
    testDir
  );
  const result = await removeAgent("nonexistent", testDir);
  expect(result).toBe(false);
});

test("switchAgent returns false when no credentials file exists", async () => {
  const result = await switchAgent("anything", testDir);
  expect(result).toBe(false);
});

test("removeAgent returns false when no credentials file exists", async () => {
  const result = await removeAgent("anything", testDir);
  expect(result).toBe(false);
});

test("listAgents returns all agents with active flag", async () => {
  await saveCredentials(
    { apiKey: "k1", recoveryKey: "r1", name: "alpha", smartAccountAddress: "0xabc" },
    testDir
  );
  await saveCredentials(
    { apiKey: "k2", recoveryKey: "r2", name: "beta" },
    testDir
  );
  const agents = await listAgents(testDir);
  expect(agents).toEqual([
    { name: "alpha", active: false, smartAccountAddress: "0xabc" },
    { name: "beta", active: true, smartAccountAddress: undefined },
  ]);
});

test("listAgents returns empty array when no file exists", async () => {
  const agents = await listAgents(testDir);
  expect(agents).toEqual([]);
});

test("v1 flat format migrates to v2 on save", async () => {
  // Write v1 flat format directly
  const path = join(testDir, "credentials.json");
  await Bun.write(
    path,
    JSON.stringify({ apiKey: "k1", recoveryKey: "r1", name: "drift" })
  );
  // Read should work
  const creds = await loadCredentials(testDir);
  expect(creds!.name).toBe("drift");
  // Save a new agent to trigger migration
  await saveCredentials(
    { apiKey: "k2", recoveryKey: "r2", name: "specter" },
    testDir
  );
  const store = await loadCredentialsStore(testDir);
  expect(store!.version).toBe(2);
  expect(store!.agents.drift.apiKey).toBe("k1");
  expect(store!.agents.specter.apiKey).toBe("k2");
  expect(store!.activeAgent).toBe("specter");
});

test("legacy nested format migrates to v2 on save", async () => {
  const path = join(testDir, "credentials.json");
  await Bun.write(
    path,
    JSON.stringify({
      driftwood: {
        apiKey: "fml_legacy_key",
        username: "driftwood",
        recoveryKey: "rec_legacy",
      },
    })
  );
  // Read works
  const creds = await loadCredentials(testDir);
  expect(creds!.name).toBe("driftwood");
  // Save triggers migration
  await saveCredentials(
    { apiKey: "k2", recoveryKey: "r2", name: "specter" },
    testDir
  );
  const store = await loadCredentialsStore(testDir);
  expect(store!.version).toBe(2);
  expect(store!.agents.driftwood.apiKey).toBe("fml_legacy_key");
  expect(store!.agents.specter.apiKey).toBe("k2");
});
