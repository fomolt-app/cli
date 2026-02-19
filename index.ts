import { Command } from "commander";
import { ApiError } from "./src/client";
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

function getContext(): CmdContext {
  const opts = program.opts();
  return {
    apiUrl: opts.apiUrl ?? "https://fomolt.com",
    apiKey: opts.apiKey,
  };
}

program.addCommand(authCommands(getContext));
program.addCommand(paperCommands(getContext));
program.addCommand(liveCommands(getContext));
program.addCommand(watchCommands(getContext));
program.addCommand(configCommands());
program.addCommand(achievementsCommand(getContext));
program.addCommand(leaderboardCommand(getContext));
program.addCommand(feedCommand(getContext));
program.addCommand(specCommand(getContext));

async function main() {
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
