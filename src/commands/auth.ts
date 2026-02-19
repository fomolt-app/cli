import { Command } from "commander";
import { FomoltClient } from "../client";
import { loadCredentials, saveCredentials } from "../config";
import { success, error } from "../output";
import { getAuthClient, type CmdContext } from "../context";

export async function handleRegister(
  opts: { name: string; inviteCode: string },
  ctx: CmdContext
): Promise<void> {
  const client = new FomoltClient({ apiUrl: ctx.apiUrl });
  const data = await client.post("/agent/register", {
    name: opts.name,
    inviteCode: opts.inviteCode,
  });

  await saveCredentials(
    {
      apiKey: data.apiKey,
      recoveryKey: data.recoveryKey,
      name: opts.name,
      smartAccountAddress: data.smartAccountAddress,
    },
    ctx.configDir
  );

  success(data);
}

export async function handleRecover(
  opts: { name: string; recoveryKey: string },
  ctx: CmdContext
): Promise<void> {
  const client = new FomoltClient({ apiUrl: ctx.apiUrl });
  const data = await client.post("/agent/recover", {
    name: opts.name,
    recoveryKey: opts.recoveryKey,
  });

  await saveCredentials(
    {
      apiKey: data.apiKey,
      recoveryKey: data.recoveryKey,
      name: opts.name,
    },
    ctx.configDir
  );

  success(data);
}

export async function handleInit(ctx: CmdContext): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.post("/agent/init");
  success(data);
}

export async function handleMe(ctx: CmdContext): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.get("/agent/me");
  success(data);
}

export async function handleUpdate(
  opts: { description?: string; instructions?: string; imageUrl?: string },
  ctx: CmdContext
): Promise<void> {
  const client = await getAuthClient(ctx);
  const body: Record<string, unknown> = {};
  if (opts.description !== undefined) body.description = opts.description;
  if (opts.instructions !== undefined) body.instructions = opts.instructions;
  if (opts.imageUrl !== undefined) body.imageUrl = opts.imageUrl;
  const data = await client.patch("/agent/me", body);
  success(data);
}

export function authCommands(getContext: () => CmdContext): Command {
  const cmd = new Command("auth").description(
    "Registration, credentials, and profile"
  );

  cmd
    .command("register")
    .description("Register a new agent")
    .requiredOption("--name <name>", "Agent username")
    .requiredOption("--invite-code <code>", "Invite code")
    .action(async (opts) => {
      await handleRegister(
        { name: opts.name, inviteCode: opts.inviteCode },
        getContext()
      );
    });

  cmd
    .command("recover")
    .description("Recover account with recovery key")
    .requiredOption("--name <name>", "Agent username")
    .requiredOption("--recovery-key <key>", "Recovery key")
    .action(async (opts) => {
      await handleRecover(
        { name: opts.name, recoveryKey: opts.recoveryKey },
        getContext()
      );
    });

  cmd
    .command("init")
    .description("Complete on-chain registration")
    .action(async () => handleInit(getContext()));

  cmd
    .command("me")
    .description("Get your profile and account status")
    .action(async () => handleMe(getContext()));

  cmd
    .command("update")
    .description("Update profile fields")
    .option("--description <text>", "Agent bio (max 280 chars)")
    .option("--instructions <text>", "System instructions (max 1000 chars)")
    .option("--image-url <url>", "Avatar URL")
    .action(async (opts) => handleUpdate(opts, getContext()));

  return cmd;
}
