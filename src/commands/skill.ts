import { Command } from "commander";
import { join } from "path";
import { mkdirSync, existsSync } from "fs";
import { homedir } from "os";
import { success, error } from "../output";

// Bundled at compile time — always matches the binary version
import skillContent from "../../SKILL.md" with { type: "text" };

const DEFAULT_DIR = join(homedir(), ".config", "fomolt", "cli");

const TARGETS: Record<
  string,
  { path: string; format: (content: string) => string; description: string }
> = {
  claude: {
    path: "CLAUDE.md",
    format: (c) => c,
    description: "Claude Code (CLAUDE.md)",
  },
  cursor: {
    path: join(".cursor", "rules", "fomolt.mdc"),
    format: (c) =>
      `---\ndescription: Fomolt CLI — agentic trading on Base\nglobs: \nalwaysApply: true\n---\n\n${c}`,
    description: "Cursor (.cursor/rules/fomolt.mdc)",
  },
  copilot: {
    path: join(".github", "copilot-instructions.md"),
    format: (c) => c,
    description: "GitHub Copilot (.github/copilot-instructions.md)",
  },
  windsurf: {
    path: ".windsurfrules",
    format: (c) => c,
    description: "Windsurf (.windsurfrules)",
  },
};

export async function handleSkill(opts: {
  print?: boolean;
  install?: string;
}): Promise<void> {
  if (opts.print) {
    process.stdout.write(skillContent);
    return;
  }

  if (opts.install) {
    const target = TARGETS[opts.install.toLowerCase()];
    if (!target) {
      const valid = Object.keys(TARGETS).join(", ");
      error(
        `Unknown target "${opts.install}". Valid targets: ${valid}`,
        "VALIDATION_ERROR"
      );
      process.exit(1);
    }

    const fullPath = join(process.cwd(), target.path);
    const dir = join(fullPath, "..");
    mkdirSync(dir, { recursive: true });

    const existed = existsSync(fullPath);
    if (existed) {
      const existing = await Bun.file(fullPath).text();
      if (existing.includes("Fomolt CLI")) {
        // Already installed — overwrite with latest version
        await Bun.write(fullPath, target.format(skillContent));
        success({ path: fullPath, target: opts.install, updated: true });
        return;
      }
      // Append to existing file
      await Bun.write(
        fullPath,
        existing.trimEnd() + "\n\n" + target.format(skillContent)
      );
    } else {
      await Bun.write(fullPath, target.format(skillContent));
    }

    success({
      path: fullPath,
      target: opts.install,
      appended: existed,
    });
    return;
  }

  // Default: save to config directory
  mkdirSync(DEFAULT_DIR, { recursive: true });
  const path = join(DEFAULT_DIR, "SKILL.md");
  await Bun.write(path, skillContent);

  success({
    path,
    hintCLI:
      "Read the file at the path above for full CLI documentation. It contains every command, flag, pattern, and constraint.",
  });
}

export function skillCommand(): Command {
  const valid = Object.entries(TARGETS)
    .map(([k, v]) => `${k} (${v.description})`)
    .join(", ");

  return new Command("skill")
    .description("Save or install the SKILL.md agent reference")
    .option("--print", "Print SKILL.md content to stdout instead of saving")
    .option(
      "--install <target>",
      `Install into project directory for an AI agent: ${valid}`
    )
    .action(async (opts) => handleSkill(opts));
}
