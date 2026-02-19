import { test, expect, beforeEach, afterEach, mock } from "bun:test";

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
  expect(output.data.currentVersion).toBe("1.1.0");
});

test("update check reports no update when on latest", async () => {
  globalThis.fetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({ tag_name: "v1.1.0" }),
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

test("update apply reports already up to date", async () => {
  globalThis.fetch = mock(() =>
    Promise.resolve(
      new Response(
        JSON.stringify({ tag_name: "v1.1.0" }),
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
