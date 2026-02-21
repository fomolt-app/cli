import { Command } from "commander";
import { join } from "path";
import { mkdirSync, existsSync } from "fs";
import { homedir } from "os";
import { success, error } from "../output";

// Bundled at compile time — always matches the binary version
import skillContent from "../../SKILL.md" with { type: "text" };

const DEFAULT_DIR = join(homedir(), ".config", "fomolt", "cli");

/** Strip YAML frontmatter (--- ... ---) from the beginning of a string */
function stripFrontmatter(content: string): string {
  const match = content.match(/^---\n[\s\S]*?\n---\n+/);
  return match ? content.slice(match[0].length) : content;
}

const TARGETS: Record<
  string,
  {
    path: string | ((cwd: string) => string);
    format: (content: string) => string;
    description: string;
  }
> = {
  claude: {
    path: "CLAUDE.md",
    format: (c) => stripFrontmatter(c),
    description: "Claude Code (CLAUDE.md)",
  },
  cursor: {
    path: join(".cursor", "rules", "fomolt.mdc"),
    format: (c) =>
      `---\ndescription: Fomolt CLI — agentic trading on Base\nglobs: \nalwaysApply: true\n---\n\n${stripFrontmatter(c)}`,
    description: "Cursor (.cursor/rules/fomolt.mdc)",
  },
  copilot: {
    path: join(".github", "copilot-instructions.md"),
    format: (c) => stripFrontmatter(c),
    description: "GitHub Copilot (.github/copilot-instructions.md)",
  },
  windsurf: {
    path: ".windsurfrules",
    format: (c) => stripFrontmatter(c),
    description: "Windsurf (.windsurfrules)",
  },
  openclaw: {
    path: join(homedir(), ".openclaw", "skills", "fomolt", "SKILL.md"),
    format: (c) => c,
    description: "OpenClaw (~/.openclaw/skills/fomolt/SKILL.md)",
  },
};

export interface SkillInstallEntry {
  target: string;
  path: string;
}

const MANIFEST_FILE = "skill-installs.json";

export async function loadManifest(dir?: string): Promise<SkillInstallEntry[]> {
  const configDir = dir ?? join(homedir(), ".config", "fomolt", "cli");
  const file = Bun.file(join(configDir, MANIFEST_FILE));
  if (!(await file.exists())) return [];
  try {
    return await file.json();
  } catch {
    return [];
  }
}

export async function recordInstall(target: string, path: string, dir?: string): Promise<void> {
  const configDir = dir ?? join(homedir(), ".config", "fomolt", "cli");
  mkdirSync(configDir, { recursive: true });
  const manifest = await loadManifest(configDir);
  const idx = manifest.findIndex((e) => e.path === path);
  if (idx >= 0) {
    manifest[idx].target = target;
  } else {
    manifest.push({ target, path });
  }
  await Bun.write(join(configDir, MANIFEST_FILE), JSON.stringify(manifest, null, 2) + "\n");
}

export async function refreshAll(configDir?: string): Promise<{ updated: string[]; failed: { path: string; error: string }[] }> {
  const manifest = await loadManifest(configDir);
  const updated: string[] = [];
  const failed: { path: string; error: string }[] = [];

  for (const entry of manifest) {
    const target = TARGETS[entry.target];
    if (!target) {
      failed.push({ path: entry.path, error: `Unknown target: ${entry.target}` });
      continue;
    }
    try {
      const dir = join(entry.path, "..");
      if (!existsSync(dir)) {
        failed.push({ path: entry.path, error: "Directory does not exist" });
        continue;
      }
      await Bun.write(entry.path, target.format(skillContent));
      updated.push(entry.path);
    } catch (err: any) {
      failed.push({ path: entry.path, error: err.message });
    }
  }

  return { updated, failed };
}

export async function handleSkill(opts: {
  print?: boolean;
  install?: string;
  refreshAll?: boolean;
}, configDir?: string, cwd?: string): Promise<void> {
  if (opts.print) {
    process.stdout.write(skillContent);
    return;
  }

  if (opts.refreshAll) {
    const results = await refreshAll(configDir);
    success(results);
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

    const fullPath =
      typeof target.path === "function"
        ? target.path(cwd ?? process.cwd())
        : target.path.startsWith("/")
          ? target.path
          : join(cwd ?? process.cwd(), target.path);
    const dir = join(fullPath, "..");
    mkdirSync(dir, { recursive: true });

    const existed = existsSync(fullPath);
    if (existed) {
      const existing = await Bun.file(fullPath).text();
      if (existing.includes("Fomolt CLI")) {
        // Already installed — overwrite with latest version
        await Bun.write(fullPath, target.format(skillContent));
        await recordInstall(opts.install.toLowerCase(), fullPath, configDir);
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

    await recordInstall(opts.install.toLowerCase(), fullPath, configDir);
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
    .option("--refresh-all", "Refresh all installed SKILL.md copies (internal)")
    .action(async (opts) => handleSkill(opts));
}
