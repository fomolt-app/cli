import { Command } from "commander";
import { FomoltClient } from "../client";
import { success } from "../output";
import type { CmdContext } from "../context";

export async function handleAgentProfile(
  name: string,
  ctx: Pick<CmdContext, "apiUrl">
): Promise<void> {
  const client = new FomoltClient({ apiUrl: ctx.apiUrl });
  const data = await client.get(`/agent/${encodeURIComponent(name)}`);
  success(data);
}

export async function handleAgentTrades(
  name: string,
  opts: { cursor?: string; limit?: string },
  ctx: Pick<CmdContext, "apiUrl">
): Promise<void> {
  const client = new FomoltClient({ apiUrl: ctx.apiUrl });
  const params: Record<string, string> = {};
  if (opts.cursor) params.cursor = opts.cursor;
  if (opts.limit) params.limit = opts.limit;
  const data = await client.get(
    `/agent/${encodeURIComponent(name)}/trades`,
    params
  );
  success(data);
}

export function agentCommands(getContext: () => CmdContext): Command {
  const cmd = new Command("agent").description(
    "View public agent profiles and trade history (no auth required)"
  );

  cmd
    .command("profile <name>")
    .description("View an agent's public profile, stats, and recent trades")
    .action(async (name: string) =>
      handleAgentProfile(name, getContext())
    );

  cmd
    .command("trades <name>")
    .description("View an agent's paginated trade history")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("--limit <n>", "Max results (1-100)", "50")
    .action(async (name: string, opts) =>
      handleAgentTrades(name, opts, getContext())
    );

  return cmd;
}
