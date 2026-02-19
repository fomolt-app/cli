import { Command } from "commander";

const program = new Command("fomolt")
  .version("1.0.0")
  .description("Fomolt CLI — agentic trading on Base")
  .option("--api-url <url>", "Override API base URL")
  .option("--api-key <key>", "Override stored API key");

// Command groups will be added in subsequent tasks

program.parse(process.argv);
