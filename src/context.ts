import { FomoltClient } from "./client";
import { loadCredentials, loadCredentialsStore } from "./config";
import { error } from "./output";

export interface CmdContext {
  apiUrl: string;
  apiKey?: string;
  configDir?: string;
  agent?: string;
}

export async function getAuthClient(ctx: CmdContext): Promise<FomoltClient> {
  let apiKey = ctx.apiKey;
  if (!apiKey) {
    const creds = await loadCredentials(ctx.configDir, ctx.agent);
    apiKey = creds?.apiKey;
  }
  if (!apiKey) {
    if (ctx.agent) {
      const store = await loadCredentialsStore(ctx.configDir);
      if (store && !store.agents[ctx.agent]) {
        error(`Agent "${ctx.agent}" not found. Run: fomolt auth list`, "AGENT_NOT_FOUND");
        process.exit(1);
      }
    }
    error("Not authenticated. Run: fomolt auth register", "NO_CREDENTIALS");
    process.exit(1);
  }
  return new FomoltClient({ apiUrl: ctx.apiUrl, apiKey });
}
