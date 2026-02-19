import { join } from "path";
import { mkdirSync, chmodSync } from "fs";
import { homedir } from "os";

export interface Credentials {
  apiKey: string;
  recoveryKey: string;
  name: string;
  smartAccountAddress?: string;
}

export interface Config {
  apiUrl?: string;
  [key: string]: string | undefined;
}

const DEFAULT_DIR = join(homedir(), ".config", "fomolt", "cli");

export async function loadCredentials(
  dir = DEFAULT_DIR
): Promise<Credentials | null> {
  const path = join(dir, "credentials.json");
  const file = Bun.file(path);
  if (!(await file.exists())) return null;
  const data = await file.json();

  // Current format: { apiKey, recoveryKey, name, ... }
  if (data.apiKey && data.name) {
    return data as Credentials;
  }

  // Legacy format: { agentName: { apiKey, username, ... } }
  const keys = Object.keys(data);
  if (keys.length === 1 && typeof data[keys[0]] === "object") {
    const legacy = data[keys[0]];
    if (legacy.apiKey) {
      return {
        apiKey: legacy.apiKey,
        recoveryKey: legacy.recoveryKey ?? "",
        name: legacy.username ?? keys[0],
        smartAccountAddress: legacy.smartAccountAddress,
      };
    }
  }

  return null;
}

export async function saveCredentials(
  creds: Credentials,
  dir = DEFAULT_DIR
): Promise<void> {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "credentials.json");
  await Bun.write(path, JSON.stringify(creds, null, 2) + "\n");
  chmodSync(path, 0o600);
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
