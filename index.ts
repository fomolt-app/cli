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

const program = new Command("fomolt")
  .version("1.0.0")
  .description("Fomolt CLI — agentic trading on Base")
  .option("--api-url <url>", "Override API base URL")
  .option("--api-key <key>", "Override stored API key");

async function showStatus() {
  const creds = await loadCredentials();
  console.log("Fomolt CLI v1.0.0\n");
  if (creds?.apiKey && creds?.name) {
    console.log(`  Authenticated as: ${creds.name}`);
    if (creds.smartAccountAddress) {
      console.log(`  Smart account:    ${creds.smartAccountAddress}`);
    }
    console.log("\nCommands:");
    console.log("  fomolt paper portfolio           Check paper positions");
    console.log("  fomolt paper trade --help         Place a paper trade");
    console.log("  fomolt live balance               Check live balances");
    console.log("  fomolt auth me                    View full profile");
    console.log("  fomolt --help                     All commands");
  } else {
    console.log("  Not authenticated.\n");
    console.log("Get started:");
    console.log("  fomolt auth register --name <name> --invite-code <code>");
    console.log("  fomolt auth import --api-key <key> --name <name>");
    console.log("\nDocs: https://fomolt.com/skill.md");
  }
}

async function main() {
  const storedConfig = await loadConfig();

  function getContext(): CmdContext {
    const opts = program.opts();
    return {
      apiUrl: opts.apiUrl ?? storedConfig.apiUrl ?? "https://fomolt.com",
      apiKey: opts.apiKey,
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
