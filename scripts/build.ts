import { $ } from "bun";
import { mkdirSync } from "fs";

const targets = [
  { name: "fomolt-darwin-arm64", target: "bun-darwin-arm64" },
  { name: "fomolt-linux-x64", target: "bun-linux-x64" },
] as const;

mkdirSync("dist", { recursive: true });

for (const { name, target } of targets) {
  console.log(`Building ${name}...`);
  await $`bun build --compile --target=${target} index.ts --outfile dist/${name}`;
}

console.log("Done. Binaries in dist/");
