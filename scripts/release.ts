import { $ } from "bun";

const version = (await Bun.file("package.json").json()).version;
const tag = `v${version}`;

console.log(`Releasing ${tag}...`);

// Build binaries
console.log("Building binaries...");
await $`bun run scripts/build.ts`;

// Create GitHub release and upload binaries
console.log(`Creating GitHub release ${tag}...`);
await $`gh release create ${tag} \
  dist/fomolt-darwin-arm64 \
  dist/fomolt-linux-x64 \
  --repo fomolt-app/cli \
  --title ${tag} \
  --notes ${"Fomolt CLI " + tag + "\n\n## Install\n\n```sh\ncurl -fsSL https://raw.githubusercontent.com/fomolt-app/cli/main/install.sh | sh\n```\n\n## Binaries\n\n- `fomolt-darwin-arm64` — macOS Apple Silicon\n- `fomolt-linux-x64` — Linux x64"}`;

console.log(`Released ${tag}`);
console.log(`https://github.com/fomolt-app/cli/releases/tag/${tag}`);
