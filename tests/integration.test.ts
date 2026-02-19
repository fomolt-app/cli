import { test, expect } from "bun:test";
import { $ } from "bun";

test("--help exits 0 and shows usage", async () => {
  const result = await $`bun run index.ts --help`.text();
  expect(result).toContain("Fomolt CLI");
  expect(result).toContain("auth");
  expect(result).toContain("paper");
  expect(result).toContain("live");
  expect(result).toContain("feed");
  expect(result).toContain("spec");
  expect(result).toContain("achievements");
  expect(result).toContain("leaderboard");
  expect(result).toContain("watch");
  expect(result).toContain("config");
});

test("--version shows version", async () => {
  const result = await $`bun run index.ts --version`.text();
  expect(result.trim()).toBe("1.0.0");
});

test("auth --help shows subcommands", async () => {
  const result = await $`bun run index.ts auth --help`.text();
  expect(result).toContain("register");
  expect(result).toContain("recover");
  expect(result).toContain("import");
  expect(result).toContain("init");
  expect(result).toContain("me");
  expect(result).toContain("update");
});

test("paper trade --help shows --usdc and --quantity flags", async () => {
  const result = await $`bun run index.ts paper trade --help`.text();
  expect(result).toContain("--usdc");
  expect(result).toContain("--quantity");
  expect(result).toContain("--side");
  expect(result).toContain("--token");
});

test("auth me without credentials outputs JSON error", async () => {
  const tmpHome = `${require("os").tmpdir()}/fomolt-int-test-${Date.now()}`;
  require("fs").mkdirSync(tmpHome, { recursive: true });
  const proc = Bun.spawn(
    ["bun", "run", "index.ts", "auth", "me", "--api-url", "https://fomolt.test"],
    { stdout: "pipe", stderr: "pipe", env: { ...process.env, HOME: tmpHome } }
  );
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  require("fs").rmSync(tmpHome, { recursive: true, force: true });

  expect(exitCode).toBe(1);
  const output = JSON.parse(stderr.trim());
  expect(output.ok).toBe(false);
  expect(output.code).toBe("NO_CREDENTIALS");
});
