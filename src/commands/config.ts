import { Command } from "commander";
import { loadConfig, saveConfig } from "../config";
import { success } from "../output";

export async function handleConfigSet(
  key: string,
  value: string,
  configDir?: string
): Promise<void> {
  const config = await loadConfig(configDir);
  config[key] = value;
  await saveConfig(config, configDir);
  success({ key, value });
}

export async function handleConfigGet(
  key: string,
  configDir?: string
): Promise<void> {
  const config = await loadConfig(configDir);
  success({ key, value: config[key] ?? null });
}

export async function handleConfigList(configDir?: string): Promise<void> {
  const config = await loadConfig(configDir);
  success(config);
}

export function configCommands(): Command {
  const cmd = new Command("config").description("Manage CLI configuration");

  cmd
    .command("set <key> <value>")
    .description("Set a config value")
    .action((key: string, value: string) => handleConfigSet(key, value));

  cmd
    .command("get <key>")
    .description("Get a config value")
    .action((key: string) => handleConfigGet(key));

  cmd
    .command("list")
    .description("List all config values")
    .action(() => handleConfigList());

  return cmd;
}
