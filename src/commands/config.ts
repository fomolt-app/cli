import { Command } from "commander";
import { loadConfig, saveConfig, validateConfigValue, deleteConfigKey } from "../config";
import { success, error } from "../output";

export async function handleConfigSet(
  key: string,
  value: string,
  configDir?: string,
  force = false
): Promise<void> {
  const err = validateConfigValue(key, value, force);
  if (err) {
    error(err, "INVALID_CONFIG");
    process.exit(1);
  }
  const config = await loadConfig(configDir);
  config[key] = value;
  await saveConfig(config, configDir);
  success({ key, value });
}

export async function handleConfigReset(
  key: string,
  configDir?: string
): Promise<void> {
  await deleteConfigKey(key, configDir);
  success({ key, value: null, message: `Reset "${key}" to default` });
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
    .option("--force", "Allow untrusted API URLs")
    .action((key: string, value: string, opts: { force?: boolean }) => handleConfigSet(key, value, undefined, !!opts.force));

  cmd
    .command("get <key>")
    .description("Get a config value")
    .action((key: string) => handleConfigGet(key));

  cmd
    .command("list")
    .description("List all config values")
    .action(() => handleConfigList());

  cmd
    .command("reset <key>")
    .description("Reset a config value to its default")
    .action(async (key: string) => handleConfigReset(key));

  return cmd;
}
