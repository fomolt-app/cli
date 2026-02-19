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
