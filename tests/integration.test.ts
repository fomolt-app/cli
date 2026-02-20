import { test, expect } from "bun:test";
import { $ } from "bun";

const PKG_VERSION: string = (await Bun.file("package.json").json()).version;

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
  expect(result).toContain("agent");
  expect(result).toContain("copy");
  expect(result).toContain("--agent");
});

test("--version shows version", async () => {
  const result = await $`bun run index.ts --version`.text();
  expect(result.trim()).toBe(PKG_VERSION);
});

test("auth --help shows subcommands", async () => {
  const result = await $`bun run index.ts auth --help`.text();
  expect(result).toContain("register");
  expect(result).toContain("recover");
  expect(result).toContain("import");
  expect(result).toContain("init");
  expect(result).toContain("me");
  expect(result).toContain("update");
  expect(result).toContain("list");
  expect(result).toContain("switch");
  expect(result).toContain("remove");
});

test("paper trade --help shows --usdc and --quantity flags", async () => {
  const result = await $`bun run index.ts paper trade --help`.text();
  expect(result).toContain("--usdc");
  expect(result).toContain("--quantity");
  expect(result).toContain("--side");
  expect(result).toContain("--token");
});

test("agent --help shows subcommands", async () => {
  const result = await $`bun run index.ts agent --help`.text();
  expect(result).toContain("profile");
  expect(result).toContain("trades");
  expect(result).toContain("no auth required");
});

test("copy --help shows all flags", async () => {
  const result = await $`bun run index.ts copy --help`.text();
  expect(result).toContain("--market");
  expect(result).toContain("--max-usdc");
  expect(result).toContain("--interval");
  expect(result).toContain("paper or live");
});

test("agent trades --help shows pagination flags", async () => {
  const result = await $`bun run index.ts agent trades --help`.text();
  expect(result).toContain("--cursor");
  expect(result).toContain("--limit");
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
