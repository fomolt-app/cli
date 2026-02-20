import { test, expect, beforeEach, afterEach, mock } from "bun:test";
import { tmpdir } from "os";
import { join } from "path";
import { mkdirSync, rmSync, writeFileSync, existsSync } from "fs";

let stdout: string[] = [];
let stderr: string[] = [];
const originalWrite = process.stdout.write;
const originalErrWrite = process.stderr.write;
const originalFetch = globalThis.fetch;

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
  globalThis.fetch = originalFetch;
});

test("update check reports update available when newer version exists", async () => {
  globalThis.fetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({ tag_name: "v99.0.0" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    )
  ) as any;

  const { handleCheck } = await import("../../src/commands/update");
  await handleCheck();

  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.updateAvailable).toBe(true);
  expect(output.data.version).toBe("99.0.0");
  expect(output.data.currentVersion).toBe("1.2.0");
});

test("update check reports no update when on latest", async () => {
  globalThis.fetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({ tag_name: "v1.2.0" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    )
  ) as any;

  const { handleCheck } = await import("../../src/commands/update");
  await handleCheck();

  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.updateAvailable).toBe(false);
});

test("update check reports no update when on newer version", async () => {
  globalThis.fetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({ tag_name: "v1.0.0" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    )
  ) as any;

  const { handleCheck } = await import("../../src/commands/update");
  await handleCheck();

  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.updateAvailable).toBe(false);
});

test("uninstall removes binary and reports success", async () => {
  // Create a fake binary to uninstall
  const testDir = join(
    tmpdir(),
    `fomolt-uninstall-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  mkdirSync(testDir, { recursive: true });
  const fakeBin = join(testDir, "fomolt");
  writeFileSync(fakeBin, "fake");

  // Mock process.execPath to point at our fake binary
  const originalExecPath = process.execPath;
  Object.defineProperty(process, "execPath", { value: fakeBin, writable: true });

  const { handleUninstall } = await import("../../src/commands/update");
  await handleUninstall({ purge: false });

  Object.defineProperty(process, "execPath", { value: originalExecPath, writable: true });

  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.removed).toContain(fakeBin);
  expect(output.data.purged).toBe(false);
  expect(existsSync(fakeBin)).toBe(false);

  rmSync(testDir, { recursive: true, force: true });
});

test("update apply reports already up to date", async () => {
  globalThis.fetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({ tag_name: "v1.2.0" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    )
  ) as any;

  const { handleUpdate } = await import("../../src/commands/update");
  await handleUpdate();

  const output = JSON.parse(stdout.join(""));
  expect(output.ok).toBe(true);
  expect(output.data.message).toBe("Already up to date");
});
