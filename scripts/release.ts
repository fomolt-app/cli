import { $ } from "bun";
import { CryptoHasher } from "bun";

const version = (await Bun.file("package.json").json()).version;
const tag = `v${version}`;

const binaries = ["fomolt-darwin-arm64", "fomolt-linux-x64"];

console.log(`Releasing ${tag}...`);

// Build binaries
console.log("Building binaries...");
await $`bun run scripts/build.ts`;

// Generate SHA-256 checksums
console.log("Generating checksums...");
const checksumLines: string[] = [];
for (const name of binaries) {
  const bytes = await Bun.file(`dist/${name}`).arrayBuffer();
  const hash = new CryptoHasher("sha256").update(bytes).digest("hex");
  checksumLines.push(`${hash}  ${name}`);
}
await Bun.write("dist/checksums.txt", checksumLines.join("\n") + "\n");
console.log("Checksums written to dist/checksums.txt");

// Create GitHub release and upload binaries + checksums
console.log(`Creating GitHub release ${tag}...`);
await $`gh release create ${tag} \
  dist/fomolt-darwin-arm64 \
  dist/fomolt-linux-x64 \
  dist/checksums.txt \
  --repo fomolt-app/cli \
  --title ${tag} \
  --notes ${"Fomolt CLI " + tag + "\n\n## Install\n\n```sh\ncurl -fsSL https://raw.githubusercontent.com/fomolt-app/cli/main/install.sh | sh\n```\n\n## Binaries\n\n- `fomolt-darwin-arm64` — macOS Apple Silicon\n- `fomolt-linux-x64` — Linux x64\n\nChecksums are published in `checksums.txt`."}`;

console.log(`Released ${tag}`);
console.log(`https://github.com/fomolt-app/cli/releases/tag/${tag}`);
