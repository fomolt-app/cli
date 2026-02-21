import { Command } from "commander";
import { unlinkSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { success, error } from "../output";

const REPO = "fomolt-app/cli";
const VERSION = "1.7.0";

export async function refreshSkillInstalls(execPath?: string): Promise<{ updated: string[]; failed: { path: string; error: string }[] }> {
  const binary = execPath ?? process.execPath;
  try {
    const proc = Bun.spawn([binary, "skill", "--refresh-all"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const text = await new Response(proc.stdout).text();
    await proc.exited;
    const output = JSON.parse(text);
    if (output.ok) return output.data;
    return { updated: [], failed: [] };
  } catch {
    return { updated: [], failed: [] };
  }
}

interface ReleaseInfo {
  tag: string;
  version: string;
  updateAvailable: boolean;
  currentVersion: string;
  downloadUrl?: string;
  checksumUrl?: string;
}

function getBinaryName(): string {
  const os = process.platform === "darwin" ? "darwin" : "linux";
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  return `fomolt-${os}-${arch}`;
}

function compareVersions(current: string, latest: string): number {
  const a = current.split(".").map(Number);
  const b = latest.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) < (b[i] ?? 0)) return -1;
    if ((a[i] ?? 0) > (b[i] ?? 0)) return 1;
  }
  return 0;
}

async function fetchLatestRelease(): Promise<ReleaseInfo> {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/releases/latest`,
    { headers: { Accept: "application/vnd.github+json" } }
  );
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`);
  }
  const data = await res.json();
  const tag = data.tag_name as string;
  const latestVersion = tag.replace(/^v/, "");
  const binary = getBinaryName();

  return {
    tag,
    version: latestVersion,
    currentVersion: VERSION,
    updateAvailable: compareVersions(VERSION, latestVersion) < 0,
    downloadUrl: `https://github.com/${REPO}/releases/download/${tag}/${binary}`,
    checksumUrl: `https://github.com/${REPO}/releases/download/${tag}/checksums.txt`,
  };
}

export async function handleCheck(): Promise<void> {
  const info = await fetchLatestRelease();
  success({
    ...info,
    message: info.updateAvailable
      ? `Update available: ${info.version}. Run "fomolt update apply" to install.`
      : "Already up to date.",
  });
}

export async function handleUpdate(): Promise<void> {
  const info = await fetchLatestRelease();

  if (!info.updateAvailable) {
    success({
      message: "Already up to date",
      currentVersion: VERSION,
      latestVersion: info.version,
    });
    return;
  }

  const binary = getBinaryName();

  // Download checksum file
  const checksumRes = await fetch(info.checksumUrl!);
  if (!checksumRes.ok) {
    throw new Error("Failed to download checksums");
  }
  const checksumText = await checksumRes.text();
  const expectedHash = checksumText
    .split("\n")
    .find((line) => line.endsWith(`  ${binary}`))
    ?.split("  ")[0];

  if (!expectedHash) {
    throw new Error(`No checksum found for ${binary}`);
  }

  // Download binary
  const binRes = await fetch(info.downloadUrl!);
  if (!binRes.ok) {
    throw new Error(`Failed to download binary: ${binRes.status}`);
  }
  const bytes = await binRes.arrayBuffer();

  // Verify checksum
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(bytes);
  const actualHash = hasher.digest("hex");

  if (actualHash !== expectedHash) {
    error("Checksum mismatch — download may be corrupted", "CHECKSUM_MISMATCH", {
      expected: expectedHash,
      actual: actualHash,
    });
    process.exit(1);
  }

  // Find current binary path and replace it
  const execPath = process.execPath;
  const tmpPath = execPath + ".tmp";

  await Bun.write(tmpPath, bytes);
  const { chmodSync, renameSync } = await import("fs");
  chmodSync(tmpPath, 0o755);
  renameSync(tmpPath, execPath);

  const skillRefresh = await refreshSkillInstalls(execPath);

  success({
    message: `Updated from ${VERSION} to ${info.version}`,
    previousVersion: VERSION,
    newVersion: info.version,
    skillRefresh,
  });
}

export async function handleUninstall(opts: { purge?: boolean }): Promise<void> {
  const removed: string[] = [];

  // Remove the binary
  const execPath = process.execPath;
  if (existsSync(execPath)) {
    unlinkSync(execPath);
    removed.push(execPath);
  }

  // Remove credentials and config if --purge
  if (opts.purge) {
    const configDir = join(homedir(), ".config", "fomolt", "cli");
    if (existsSync(configDir)) {
      rmSync(configDir, { recursive: true, force: true });
      removed.push(configDir);
    }
  }

  success({
    message: "Fomolt CLI uninstalled",
    removed,
    purged: opts.purge ?? false,
  });
}

export function updateCommands(): Command {
  const cmd = new Command("update").description("Check for and install updates");

  cmd
    .command("check")
    .description("Check if a newer version is available")
    .action(async () => handleCheck());

  cmd
    .command("apply")
    .description("Download and install the latest version")
    .action(async () => handleUpdate());

  cmd
    .command("uninstall")
    .description("Remove fomolt binary (--purge to also delete credentials)")
    .option("--purge", "Also remove stored credentials and config")
    .action(async (opts) => handleUninstall(opts));

  // Default: check
  cmd.action(async () => handleCheck());

  return cmd;
}
