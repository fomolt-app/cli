import { test, expect, beforeEach, afterEach, mock } from "bun:test";
import { tmpdir } from "os";
import { join } from "path";
import { mkdirSync, rmSync } from "fs";

let testDir: string;
let stdout: string[] = [];
let stderr: string[] = [];
const originalWrite = process.stdout.write;
const originalErrWrite = process.stderr.write;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  testDir = join(
    tmpdir(),
    `fomolt-auth-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  mkdirSync(testDir, { recursive: true });
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
  globalThis.fetch = originalFetch;
  rmSync(testDir, { recursive: true, force: true });
});

test("auth register saves credentials and outputs result", async () => {
  globalThis.fetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          response: {
            apiKey: "key-123",
            recoveryKey: "rec-456",
            smartAccountAddress: "0xabc",
            minimumDeposit: "1",
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": "r1",
          },
        }
      )
    )
  ) as any;

  const { handleRegister } = await import("../../src/commands/auth");
  await handleRegister(
    { name: "test_agent", inviteCode: "INV" },
    { apiUrl: "https://fomolt.test", configDir: testDir }
  );

  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.apiKey).toBe("key-123");
  expect(output.data.smartAccountAddress).toBe("0xabc");

  const { loadCredentials } = await import("../../src/config");
  const creds = await loadCredentials(testDir);
  expect(creds).not.toBeNull();
  expect(creds!.apiKey).toBe("key-123");
  expect(creds!.name).toBe("test_agent");
});

test("auth me outputs profile data", async () => {
  globalThis.fetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          response: { username: "test_agent", usdcBalance: "10000" },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": "r2",
          },
        }
      )
    )
  ) as any;

  const { handleMe } = await import("../../src/commands/auth");
  await handleMe({ apiUrl: "https://fomolt.test", apiKey: "key-123" });

  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.username).toBe("test_agent");
});

test("auth recover with --name sends correct request", async () => {
  const mockFetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          response: { apiKey: "new-key", recoveryKey: "new-rec" },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": "r3",
          },
        }
      )
    )
  );
  globalThis.fetch = mockFetch as any;

  const { handleRecover } = await import("../../src/commands/auth");
  await handleRecover(
    { name: "my_agent", recoveryKey: "old-rec" },
    { apiUrl: "https://fomolt.test", configDir: testDir }
  );

  const call = mockFetch.mock.calls[0];
  const body = JSON.parse(call[1].body);
  expect(body.name).toBe("my_agent");
  expect(body.recoveryKey).toBe("old-rec");

  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.apiKey).toBe("new-key");
});

test("auth import validates key and saves credentials with name from API", async () => {
  globalThis.fetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          response: {
            username: "imported_agent",
            smartAccountAddress: "0xdef",
            usdcBalance: "500",
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Request-Id": "r4",
          },
        }
      )
    )
  ) as any;

  const { handleImport } = await import("../../src/commands/auth");
  await handleImport(
    { apiKey: "existing-key" },
    { apiUrl: "https://fomolt.test", configDir: testDir }
  );

  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.imported).toBe(true);
  expect(output.data.name).toBe("imported_agent");

  const { loadCredentials } = await import("../../src/config");
  const creds = await loadCredentials(testDir);
  expect(creds).not.toBeNull();
  expect(creds!.apiKey).toBe("existing-key");
  expect(creds!.name).toBe("imported_agent");
  expect(creds!.smartAccountAddress).toBe("0xdef");
});

test("auth list returns all stored agents", async () => {
  const { saveCredentials } = await import("../../src/config");
  await saveCredentials(
    { apiKey: "k1", recoveryKey: "r1", name: "alpha", smartAccountAddress: "0x1" },
    testDir
  );
  await saveCredentials(
    { apiKey: "k2", recoveryKey: "r2", name: "beta" },
    testDir
  );

  const { handleList } = await import("../../src/commands/auth");
  await handleList({ apiUrl: "https://fomolt.test", configDir: testDir });

  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data).toEqual([
    { name: "alpha", active: false, smartAccountAddress: "0x1" },
    { name: "beta", active: true, smartAccountAddress: undefined },
  ]);
});

test("auth switch changes active agent", async () => {
  const { saveCredentials, loadCredentialsStore } = await import(
    "../../src/config"
  );
  await saveCredentials(
    { apiKey: "k1", recoveryKey: "r1", name: "alpha" },
    testDir
  );
  await saveCredentials(
    { apiKey: "k2", recoveryKey: "r2", name: "beta" },
    testDir
  );

  const { handleSwitch } = await import("../../src/commands/auth");
  await handleSwitch({ name: "alpha" }, { apiUrl: "https://fomolt.test", configDir: testDir });

  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.switched).toBe("alpha");

  const store = await loadCredentialsStore(testDir);
  expect(store!.activeAgent).toBe("alpha");
});

test("auth remove deletes agent from store", async () => {
  const { saveCredentials, loadCredentialsStore } = await import(
    "../../src/config"
  );
  await saveCredentials(
    { apiKey: "k1", recoveryKey: "r1", name: "alpha" },
    testDir
  );
  await saveCredentials(
    { apiKey: "k2", recoveryKey: "r2", name: "beta" },
    testDir
  );

  const { handleRemove } = await import("../../src/commands/auth");
  await handleRemove({ name: "alpha" }, { apiUrl: "https://fomolt.test", configDir: testDir });

  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.removed).toBe("alpha");

  const store = await loadCredentialsStore(testDir);
  expect(Object.keys(store!.agents)).toEqual(["beta"]);
});

test("auth import twice stores both agents", async () => {
  let callCount = 0;
  globalThis.fetch = mock(() => {
    callCount++;
    const name = callCount === 1 ? "agent_one" : "agent_two";
    return Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          response: { username: name, smartAccountAddress: `0x${callCount}` },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", "X-Request-Id": `r${callCount}` },
        }
      )
    );
  }) as any;

  const { handleImport } = await import("../../src/commands/auth");
  await handleImport(
    { apiKey: "key-1" },
    { apiUrl: "https://fomolt.test", configDir: testDir }
  );
  stdout = [];
  await handleImport(
    { apiKey: "key-2" },
    { apiUrl: "https://fomolt.test", configDir: testDir }
  );

  const { loadCredentialsStore } = await import("../../src/config");
  const store = await loadCredentialsStore(testDir);
  expect(Object.keys(store!.agents).length).toBe(2);
  expect(store!.agents.agent_one.apiKey).toBe("key-1");
  expect(store!.agents.agent_two.apiKey).toBe("key-2");
  expect(store!.activeAgent).toBe("agent_two");
});
