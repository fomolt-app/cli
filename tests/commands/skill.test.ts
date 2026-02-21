import { test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

let testDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `fomolt-skill-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

test("recordInstall creates manifest with new entry", async () => {
  const { recordInstall, loadManifest } = await import("../../src/commands/skill");
  await recordInstall("claude", "/tmp/project/CLAUDE.md", testDir);
  const manifest = await loadManifest(testDir);
  expect(manifest).toEqual([{ target: "claude", path: "/tmp/project/CLAUDE.md" }]);
});

test("recordInstall dedupes by path", async () => {
  const { recordInstall, loadManifest } = await import("../../src/commands/skill");
  await recordInstall("claude", "/tmp/project/CLAUDE.md", testDir);
  await recordInstall("claude", "/tmp/project/CLAUDE.md", testDir);
  const manifest = await loadManifest(testDir);
  expect(manifest).toHaveLength(1);
});

test("recordInstall updates target for existing path", async () => {
  const { recordInstall, loadManifest } = await import("../../src/commands/skill");
  await recordInstall("claude", "/tmp/project/CLAUDE.md", testDir);
  await recordInstall("cursor", "/tmp/project/CLAUDE.md", testDir);
  const manifest = await loadManifest(testDir);
  expect(manifest).toEqual([{ target: "cursor", path: "/tmp/project/CLAUDE.md" }]);
});

test("loadManifest returns empty array when file missing", async () => {
  const { loadManifest } = await import("../../src/commands/skill");
  const manifest = await loadManifest(testDir);
  expect(manifest).toEqual([]);
});

test("skill --install records to manifest", async () => {
  const stdout: string[] = [];
  const origWrite = process.stdout.write;
  process.stdout.write = ((chunk: string) => { stdout.push(chunk); return true; }) as any;

  const { handleSkill, loadManifest } = await import("../../src/commands/skill");
  await handleSkill({ install: "claude" }, testDir, testDir);

  process.stdout.write = origWrite;

  const manifest = await loadManifest(testDir);
  expect(manifest.length).toBe(1);
  expect(manifest[0].target).toBe("claude");
  expect(manifest[0].path).toContain("CLAUDE.md");
});

test("refreshAll rewrites all manifest entries", async () => {
  const { recordInstall, refreshAll } = await import("../../src/commands/skill");

  const fakePath = join(testDir, "project", "CLAUDE.md");
  mkdirSync(join(testDir, "project"), { recursive: true });
  await Bun.write(fakePath, "old Fomolt CLI content");
  await recordInstall("claude", fakePath, testDir);

  const results = await refreshAll(testDir);

  expect(results.updated).toContain(fakePath);
  expect(results.failed).toHaveLength(0);

  const content = await Bun.file(fakePath).text();
  expect(content).toContain("Fomolt CLI");
  expect(content).not.toBe("old Fomolt CLI content");
});

test("refreshAll reports failed paths for missing directories", async () => {
  const { recordInstall, refreshAll } = await import("../../src/commands/skill");

  await recordInstall("claude", "/nonexistent/path/CLAUDE.md", testDir);
  const results = await refreshAll(testDir);

  expect(results.updated).toHaveLength(0);
  expect(results.failed).toHaveLength(1);
  expect(results.failed[0].path).toBe("/nonexistent/path/CLAUDE.md");
});
