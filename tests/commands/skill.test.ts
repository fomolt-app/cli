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
