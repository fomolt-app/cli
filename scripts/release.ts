#!/usr/bin/env bun
/**
 * Full release script for fomolt-cli.
 *
 * Usage:
 *   bun run scripts/release.ts <patch|minor|major>
 *
 * Requires GH_TOKEN in env with repo + admin push access.
 *
 * Steps:
 *   1. Validate env (GH_TOKEN, clean working tree, on main)
 *   2. Bump version in package.json, index.ts, src/commands/update.ts
 *   3. Run tests
 *   4. Commit, push via PR, squash-merge with --admin
 *   5. Build dist binaries + checksums
 *   6. Create GitHub release with assets
 */

import { $ } from "bun";
import { CryptoHasher } from "bun";
import { mkdirSync } from "fs";

// --- Helpers ---------------------------------------------------------------

function die(msg: string): never {
  console.error(`\n  ERROR: ${msg}\n`);
  process.exit(1);
}

function bump(version: string, kind: "patch" | "minor" | "major"): string {
  const [major, minor, patch] = version.split(".").map(Number);
  switch (kind) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
  }
}

function replaceInFile(path: string, from: string, to: string) {
  const file = Bun.file(path);
  return file.text().then((text) => {
    if (!text.includes(from)) die(`Could not find "${from}" in ${path}`);
    return Bun.write(path, text.replace(from, to));
  });
}

// --- Main ------------------------------------------------------------------

const GH_TOKEN = process.env.GH_TOKEN;
if (!GH_TOKEN) die("GH_TOKEN is not set.");

const kind = process.argv[2] as "patch" | "minor" | "major" | undefined;
if (!kind || !["patch", "minor", "major"].includes(kind)) {
  die("Usage: bun run scripts/release.ts <patch|minor|major>");
}

// Must be on main with clean tree
const branch = (await $`git branch --show-current`.text()).trim();
if (branch !== "main") die(`Must be on main (currently on ${branch}).`);

const status = (await $`git status --porcelain`.text()).trim();
if (status) die("Working tree is dirty. Commit or stash changes first.");

await $`git pull --rebase origin main`.quiet();

// Read current version and compute next
const pkg = await Bun.file("package.json").json();
const currentVersion: string = pkg.version;
const nextVersion = bump(currentVersion, kind);
const tag = `v${nextVersion}`;

console.log(`\n  ${currentVersion} → ${nextVersion} (${kind})\n`);

// --- Step 1: Bump version in all files ------------------------------------

console.log("Bumping version...");
await Promise.all([
  replaceInFile("package.json", `"version": "${currentVersion}"`, `"version": "${nextVersion}"`),
  replaceInFile("index.ts", `.version("${currentVersion}")`, `.version("${nextVersion}")`),
  replaceInFile("src/commands/update.ts", `const VERSION = "${currentVersion}";`, `const VERSION = "${nextVersion}";`),
]);

// --- Step 2: Run tests ----------------------------------------------------

console.log("Running tests...");
const testResult = await $`bun test`.quiet().nothrow();
if (testResult.exitCode !== 0) {
  // Revert version bumps on failure
  await $`git checkout -- package.json index.ts src/commands/update.ts`.quiet();
  console.error(testResult.stderr.toString());
  die("Tests failed. Version bumps reverted.");
}
console.log("  All tests passed.");

// --- Step 3: Commit & PR -------------------------------------------------

const releaseBranch = `release/${tag}`;
console.log(`Creating branch ${releaseBranch}...`);
await $`git checkout -b ${releaseBranch}`.quiet();
await $`git add package.json index.ts src/commands/update.ts`.quiet();
await $`git commit -m ${"chore: bump version to " + nextVersion}`.quiet();
await $`git push -u origin ${releaseBranch}`.quiet();

console.log("Creating PR...");
const prUrl = (
  await $`GH_TOKEN=${GH_TOKEN} gh pr create --title ${"chore: bump version to " + nextVersion} --body ${"Version bump for " + tag + " release."}`.text()
).trim();
console.log(`  ${prUrl}`);

console.log("Merging PR...");
const prNumber = prUrl.split("/").pop()!;
await $`GH_TOKEN=${GH_TOKEN} gh pr merge ${prNumber} --squash --delete-branch --admin`.quiet();

// Sync local main
await $`git checkout main`.quiet();
await $`git pull --rebase origin main`.quiet();

// --- Step 4: Build --------------------------------------------------------

console.log("Building binaries...");
const targets = [
  { name: "fomolt-darwin-arm64", target: "bun-darwin-arm64" },
  { name: "fomolt-linux-x64", target: "bun-linux-x64" },
] as const;

mkdirSync("dist", { recursive: true });
for (const { name, target } of targets) {
  console.log(`  ${name}...`);
  await $`bun build --compile --target=${target} index.ts --outfile dist/${name}`.quiet();
}

// --- Step 5: Checksums ----------------------------------------------------

console.log("Generating checksums...");
const binaries = targets.map((t) => t.name);
const checksumLines: string[] = [];
for (const name of binaries) {
  const bytes = await Bun.file(`dist/${name}`).arrayBuffer();
  const hash = new CryptoHasher("sha256").update(bytes).digest("hex");
  checksumLines.push(`${hash}  ${name}`);
}
await Bun.write("dist/checksums.txt", checksumLines.join("\n") + "\n");

// --- Step 6: GitHub release -----------------------------------------------

console.log(`Creating release ${tag}...`);
const notes = [
  `Fomolt CLI ${tag}`,
  "",
  "## Install",
  "",
  "```sh",
  "curl -fsSL https://raw.githubusercontent.com/fomolt-app/cli/main/install.sh | sh",
  "```",
  "",
  "## Binaries",
  "",
  "- `fomolt-darwin-arm64` — macOS Apple Silicon",
  "- `fomolt-linux-x64` — Linux x64",
  "",
  "Checksums are published in `checksums.txt`.",
].join("\n");

await $`GH_TOKEN=${GH_TOKEN} gh release create ${tag} \
  dist/fomolt-darwin-arm64 \
  dist/fomolt-linux-x64 \
  dist/checksums.txt \
  --repo fomolt-app/cli \
  --title ${tag} \
  --notes ${notes}`;

console.log(`\n  Released ${tag}`);
console.log(`  https://github.com/fomolt-app/cli/releases/tag/${tag}\n`);
