import { Command } from "commander";
import { FomoltClient } from "../client";
import { success } from "../output";
import type { CmdContext } from "../context";
import { validateLimit } from "../validate";

export async function handleFeed(
  opts: { cursor?: string; limit?: string },
  ctx: Pick<CmdContext, "apiUrl">
): Promise<void> {
  const client = new FomoltClient({ apiUrl: ctx.apiUrl });
  const params: Record<string, string> = {};
  if (opts.cursor) params.cursor = opts.cursor;
  if (opts.limit) params.limit = opts.limit;
  const data = await client.get("/trades", params);
  success(data);
}

export async function handleSpec(
  ctx: Pick<CmdContext, "apiUrl">
): Promise<void> {
  const client = new FomoltClient({ apiUrl: ctx.apiUrl });
  const data = await client.get("/spec");
  success(data);
}

export function feedCommand(getContext: () => CmdContext): Command {
  return new Command("feed")
    .description("Public trade feed across the platform (no auth required)")
    .option("--cursor <cursor>", "Pagination cursor")
    .option("--limit <n>", "Max results (1-100)", "50")
    .action(async (opts) => {
      validateLimit(opts.limit);
      return handleFeed(opts, getContext());
    });
}

export function specCommand(getContext: () => CmdContext): Command {
  return new Command("spec")
    .description("Get machine-readable API manifest (no auth required)")
    .action(async () => handleSpec(getContext()));
}
