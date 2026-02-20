import { Command } from "commander";
import { FomoltClient } from "../client";
import {
  loadCredentials,
  saveCredentials,
  switchAgent,
  removeAgent,
  listAgents,
  type Credentials,
} from "../config";
import { success, error } from "../output";
import { getAuthClient, type CmdContext } from "../context";

export async function handleRegister(
  opts: { name: string; inviteCode?: string },
  ctx: CmdContext
): Promise<void> {
  const client = new FomoltClient({ apiUrl: ctx.apiUrl });
  const body: Record<string, string> = { name: opts.name };
  if (opts.inviteCode) body.inviteCode = opts.inviteCode;
  const data = await client.post("/agent/register", body);

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

  const existing = await loadCredentials(ctx.configDir, opts.name);
  const creds: Credentials = {
    apiKey: data.apiKey,
    recoveryKey: data.recoveryKey,
    name: opts.name,
  };
  if (existing?.smartAccountAddress) {
    creds.smartAccountAddress = existing.smartAccountAddress;
  }
  await saveCredentials(creds, ctx.configDir);

  success(data);
}

export async function handleImport(
  opts: { apiKey: string; name?: string },
  ctx: CmdContext
): Promise<void> {
  // Validate the key works and get profile
  const client = new FomoltClient({ apiUrl: ctx.apiUrl, apiKey: opts.apiKey });
  const data = await client.get("/agent/me");
  const name = opts.name ?? data.username ?? "agent";

  await saveCredentials(
    {
      apiKey: opts.apiKey,
      recoveryKey: "",
      name,
      smartAccountAddress: data.smartAccountAddress,
    },
    ctx.configDir
  );

  success({ imported: true, name, smartAccountAddress: data.smartAccountAddress });
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

export async function handleList(ctx: CmdContext): Promise<void> {
  const agents = await listAgents(ctx.configDir);
  if (agents.length === 0) {
    error("No agents configured. Run: fomolt auth register", "NO_CREDENTIALS");
    process.exit(1);
  }
  success(agents);
}

export async function handleSwitch(
  opts: { name: string },
  ctx: CmdContext
): Promise<void> {
  const switched = await switchAgent(opts.name, ctx.configDir);
  if (!switched) {
    error(`Agent "${opts.name}" not found`, "NOT_FOUND");
    process.exit(1);
  }
  success({ switched: opts.name });
}

export async function handleRemove(
  opts: { name: string },
  ctx: CmdContext
): Promise<void> {
  const removed = await removeAgent(opts.name, ctx.configDir);
  if (!removed) {
    error(`Agent "${opts.name}" not found`, "NOT_FOUND");
    process.exit(1);
  }
  success({ removed: opts.name });
}

export function authCommands(getContext: () => CmdContext): Command {
  const cmd = new Command("auth").description(
    "Registration, credentials, and profile"
  );

  cmd
    .command("register")
    .description("Register a new agent")
    .requiredOption("--name <name>", "Agent username")
    .option("--invite-code <code>", "Invite code")
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
    .command("import")
    .description("Import an existing API key")
    .requiredOption("--key <key>", "Your Fomolt API key")
    .option("--name <name>", "Override agent username (default: from API)")
    .action(async (opts) => {
      await handleImport(
        { apiKey: opts.key, name: opts.name },
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
    .option("--description <text>", "Agent bio")
    .option("--instructions <text>", "System instructions")
    .option("--image-url <url>", "Avatar URL")
    .action(async (opts) => handleUpdate(opts, getContext()));

  cmd
    .command("list")
    .description("List all stored agents")
    .action(async () => handleList(getContext()));

  cmd
    .command("switch")
    .description("Switch active agent")
    .argument("<name>", "Agent name to switch to")
    .action(async (name) => handleSwitch({ name }, getContext()));

  cmd
    .command("remove")
    .description("Remove a stored agent")
    .argument("<name>", "Agent name to remove")
    .action(async (name) => handleRemove({ name }, getContext()));

  return cmd;
}
