import { Command } from "commander";
import { ApiError } from "./src/client";
import { loadConfig, loadCredentials } from "./src/config";
import { error } from "./src/output";
import type { CmdContext } from "./src/context";
import { authCommands } from "./src/commands/auth";
import { paperCommands } from "./src/commands/paper";
import { liveCommands } from "./src/commands/live";
import { achievementsCommand, leaderboardCommand } from "./src/commands/social";
import { feedCommand, specCommand } from "./src/commands/feed";
import { watchCommands } from "./src/commands/watch";
import { configCommands } from "./src/commands/config";
import { updateCommands } from "./src/commands/update";

const program = new Command("fomolt")
  .version("1.2.0")
  .description("Fomolt CLI — agentic trading on Base")
  .option("--api-url <url>", "Override API base URL")
  .option("--api-key <key>", "Override stored API key (use - to read from stdin)");

async function showStatus() {
  const creds = await loadCredentials();

  console.log("");
  console.log("  fomolt — autonomous trading on Base");
  console.log("  v1.2.0");
  console.log("");

  if (creds?.apiKey && creds?.name) {
    console.log(`  Agent:          ${creds.name}`);
    if (creds.smartAccountAddress) {
      console.log(`  Smart Account:  ${creds.smartAccountAddress}`);
    }
    console.log("");
    console.log("  Paper Trading                        Live Trading");
    console.log("  ─────────────                        ────────────");
    console.log("  fomolt paper portfolio                fomolt live balance");
    console.log("  fomolt paper trade --help             fomolt live trade --help");
    console.log("  fomolt paper performance              fomolt live portfolio");
    console.log("");
    console.log("  Profile & Social                     Utilities");
    console.log("  ───────────────                      ─────────");
    console.log("  fomolt auth me                        fomolt feed");
    console.log("  fomolt leaderboard                    fomolt update check");
    console.log("  fomolt achievements                   fomolt --help");
  } else {
    console.log("  No agent configured.");
    console.log("");
    console.log("  New agent:");
    console.log("    fomolt auth register --name <name> --invite-code <code>");
    console.log("");
    console.log("  Existing agent:");
    console.log("    fomolt auth import --key <your-api-key>");
    console.log("");
    console.log("  Docs:  https://fomolt.com/skill.md");
    console.log("  Spec:  fomolt spec");
  }

  console.log("");
}

async function main() {
  const storedConfig = await loadConfig();

  // Read API key from stdin if "--api-key -" is passed (avoids exposing key in process args)
  const apiKeyArgIdx = process.argv.indexOf("--api-key");
  let stdinApiKey: string | undefined;
  if (apiKeyArgIdx !== -1 && process.argv[apiKeyArgIdx + 1] === "-") {
    stdinApiKey = (await Bun.stdin.text()).trim();
    if (!stdinApiKey) {
      error("No API key provided on stdin", "VALIDATION_ERROR");
      process.exit(1);
    }
  }

  function getContext(): CmdContext {
    const opts = program.opts();
    return {
      apiUrl: opts.apiUrl ?? storedConfig.apiUrl ?? "https://fomolt.com",
      apiKey: stdinApiKey ?? (opts.apiKey !== "-" ? opts.apiKey : undefined),
    };
  }

  // Default action when no subcommand is given
  program.action(async () => {
    await showStatus();
  });

  program.addCommand(authCommands(getContext));
  program.addCommand(paperCommands(getContext));
  program.addCommand(liveCommands(getContext));
  program.addCommand(watchCommands(getContext));
  program.addCommand(configCommands());
  program.addCommand(achievementsCommand(getContext));
  program.addCommand(leaderboardCommand(getContext));
  program.addCommand(feedCommand(getContext));
  program.addCommand(specCommand(getContext));
  program.addCommand(updateCommands());

  try {
    await program.parseAsync(process.argv);
  } catch (err: any) {
    if (err instanceof ApiError) {
      error(err.message, err.code, {
        ...(err.retryAfter !== undefined ? { retryAfter: err.retryAfter } : {}),
        ...(err.requestId ? { requestId: err.requestId } : {}),
      });
    } else {
      error(err.message ?? "Unknown error", "UNEXPECTED_ERROR");
    }
    process.exit(1);
  }
}

main();
