import { join } from "path";
import { mkdirSync, chmodSync } from "fs";
import { homedir } from "os";

export interface Credentials {
  apiKey: string;
  recoveryKey: string;
  name: string;
  smartAccountAddress?: string;
}

export interface CredentialsStore {
  version: 2;
  activeAgent: string;
  agents: Record<string, Credentials>;
}

export interface AgentInfo {
  name: string;
  active: boolean;
  smartAccountAddress?: string;
}

export interface Config {
  apiUrl?: string;
  [key: string]: string | undefined;
}

const DEFAULT_DIR = join(homedir(), ".config", "fomolt", "cli");

/**
 * Read raw file and migrate any format to v2 CredentialsStore.
 * Returns null if file doesn't exist or is unrecognizable.
 */
export async function loadCredentialsStore(
  dir = DEFAULT_DIR
): Promise<CredentialsStore | null> {
  const path = join(dir, "credentials.json");
  const file = Bun.file(path);
  if (!(await file.exists())) return null;
  let data: any;
  try {
    data = await file.json();
  } catch {
    return null;
  }

  // Already v2
  if (data.version === 2 && data.agents) {
    return data as CredentialsStore;
  }

  // v1 flat format: { apiKey, recoveryKey, name, ... }
  if (data.apiKey && data.name) {
    const creds: Credentials = {
      apiKey: data.apiKey,
      recoveryKey: data.recoveryKey ?? "",
      name: data.name,
      smartAccountAddress: data.smartAccountAddress,
    };
    return { version: 2, activeAgent: creds.name, agents: { [creds.name]: creds } };
  }

  // Legacy nested format: { agentName: { apiKey, username, ... } }
  const keys = Object.keys(data);
  if (keys.length === 1 && typeof data[keys[0]] === "object") {
    const legacy = data[keys[0]];
    if (legacy.apiKey) {
      const name = legacy.username ?? keys[0];
      const creds: Credentials = {
        apiKey: legacy.apiKey,
        recoveryKey: legacy.recoveryKey ?? "",
        name,
        smartAccountAddress: legacy.smartAccountAddress,
      };
      return { version: 2, activeAgent: name, agents: { [name]: creds } };
    }
  }

  return null;
}

export async function saveCredentialsStore(
  store: CredentialsStore,
  dir = DEFAULT_DIR
): Promise<void> {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "credentials.json");
  await Bun.write(path, JSON.stringify(store, null, 2) + "\n");
  chmodSync(path, 0o600);
}

/**
 * Load a single agent's credentials.
 * If agentName is provided, returns that agent (regardless of activeAgent).
 * Otherwise returns the active agent.
 */
export async function loadCredentials(
  dir = DEFAULT_DIR,
  agentName?: string
): Promise<Credentials | null> {
  const store = await loadCredentialsStore(dir);
  if (!store) return null;
  const name = agentName ?? store.activeAgent;
  return store.agents[name] ?? null;
}

/**
 * Save credentials for an agent. Read-modify-write: adds agent to store
 * and sets it as active.
 */
export async function saveCredentials(
  creds: Credentials,
  dir = DEFAULT_DIR
): Promise<void> {
  const store = (await loadCredentialsStore(dir)) ?? {
    version: 2 as const,
    activeAgent: creds.name,
    agents: {},
  };
  store.agents[creds.name] = creds;
  store.activeAgent = creds.name;
  await saveCredentialsStore(store, dir);
}

export async function switchAgent(
  name: string,
  dir = DEFAULT_DIR
): Promise<boolean> {
  const store = await loadCredentialsStore(dir);
  if (!store || !store.agents[name]) return false;
  store.activeAgent = name;
  await saveCredentialsStore(store, dir);
  return true;
}

export async function removeAgent(
  name: string,
  dir = DEFAULT_DIR
): Promise<boolean> {
  const store = await loadCredentialsStore(dir);
  if (!store || !store.agents[name]) return false;
  delete store.agents[name];
  const remaining = Object.keys(store.agents);
  if (store.activeAgent === name) {
    store.activeAgent = remaining[0] ?? "";
  }
  await saveCredentialsStore(store, dir);
  return true;
}

export async function listAgents(dir = DEFAULT_DIR): Promise<AgentInfo[]> {
  const store = await loadCredentialsStore(dir);
  if (!store) return [];
  return Object.values(store.agents).map((creds) => ({
    name: creds.name,
    active: creds.name === store.activeAgent,
    smartAccountAddress: creds.smartAccountAddress,
  }));
}

export async function loadConfig(dir = DEFAULT_DIR): Promise<Config> {
  const path = join(dir, "config.json");
  const file = Bun.file(path);
  if (!(await file.exists())) return {};
  return (await file.json()) as Config;
}

export async function saveConfig(
  config: Config,
  dir = DEFAULT_DIR
): Promise<void> {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "config.json");
  await Bun.write(path, JSON.stringify(config, null, 2) + "\n");
  chmodSync(path, 0o600);
}
