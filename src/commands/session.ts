import { readFileSync } from "node:fs";
import { Command } from "commander";
import { success, successWithHint, error } from "../output";
import { getAuthClient, type CmdContext } from "../context";
import { validateInt, validateMarket, validatePositiveNumber } from "../validate";

// ── Config builder ──

interface ConfigOpts {
  market?: string;
  maxPositionSol?: string;
  maxPositions?: string;
  stopLoss?: string;
  takeProfit?: string;
  trailingStop?: string;
  minMarketCap?: string;
  maxMarketCap?: string;
  scoutInterval?: string;
  riskInterval?: string;
  riskSlowInterval?: string;
  analystQueueMax?: string;
  watchlist?: string;
}

function buildConfigJson(opts: ConfigOpts): Record<string, unknown> | undefined {
  const config: Record<string, unknown> = {};
  let hasAny = false;

  if (opts.market !== undefined) { config.market = opts.market; hasAny = true; }
  if (opts.maxPositionSol !== undefined) { config.maxPositionSol = parseFloat(opts.maxPositionSol); hasAny = true; }
  if (opts.maxPositions !== undefined) { config.maxPositions = parseInt(opts.maxPositions, 10); hasAny = true; }
  if (opts.stopLoss !== undefined) { config.stopLossPercent = parseFloat(opts.stopLoss); hasAny = true; }
  if (opts.takeProfit !== undefined) { config.takeProfitPercent = parseFloat(opts.takeProfit); hasAny = true; }
  if (opts.trailingStop !== undefined) { config.trailingStopPercent = parseFloat(opts.trailingStop); hasAny = true; }
  if (opts.minMarketCap !== undefined) { config.minMarketCap = parseFloat(opts.minMarketCap); hasAny = true; }
  if (opts.maxMarketCap !== undefined) { config.maxMarketCap = parseFloat(opts.maxMarketCap); hasAny = true; }
  if (opts.scoutInterval !== undefined) { config.scoutIntervalSec = parseInt(opts.scoutInterval, 10); hasAny = true; }
  if (opts.riskInterval !== undefined) { config.riskCheckIntervalSec = parseInt(opts.riskInterval, 10); hasAny = true; }
  if (opts.riskSlowInterval !== undefined) { config.riskSlowCheckSec = parseInt(opts.riskSlowInterval, 10); hasAny = true; }
  if (opts.analystQueueMax !== undefined) { config.analystQueueMax = parseInt(opts.analystQueueMax, 10); hasAny = true; }
  if (opts.watchlist !== undefined) {
    config.watchlist = opts.watchlist.split(",").map((s) => s.trim()).filter(Boolean);
    hasAny = true;
  }

  return hasAny ? config : undefined;
}

function resolveTraderMd(traderMd?: string, traderMdFile?: string): string | undefined {
  if (traderMdFile) {
    try {
      return readFileSync(traderMdFile, "utf-8");
    } catch (e: any) {
      error(`Could not read --trader-md-file: ${e.message}`, "FILE_READ_ERROR");
      process.exit(1);
    }
  }
  return traderMd;
}

function addConfigOptions(cmd: Command): Command {
  return cmd
    // Market
    .option("--market <market>", "Market mode: paper or live (default: paper)")
    // Position sizing
    .option("--max-position-sol <n>", "Max SOL per position (default: 0.5, range: 0.01–100)")
    .option("--max-positions <n>", "Max concurrent positions (default: 10, range: 1–50)")
    // Risk management
    .option("--stop-loss <n>", "Stop loss trigger, e.g. -20 for -20% (default: -20, range: -50 to -1)")
    .option("--take-profit <n>", "Take profit trigger, e.g. 100 for +100% (default: 100, range: 10–1000)")
    .option("--trailing-stop <n>", "Trailing stop from peak, e.g. -10 for -10% (default: -10, range: -50 to -1)")
    // Token filters
    .option("--min-market-cap <usd>", "Min market cap in USD (default: 50000)")
    .option("--max-market-cap <usd>", "Max market cap in USD (default: 500000)")
    .option("--watchlist <addrs>", "Comma-separated token addresses to watch (default: none)")
    // Timing
    .option("--scout-interval <sec>", "Seconds between token scans (default: 60, range: 10–600)")
    .option("--risk-interval <sec>", "Seconds between risk checks (default: 15, range: 5–300)")
    .option("--risk-slow-interval <sec>", "Seconds between slow risk checks (default: 60, range: 10–600)")
    .option("--analyst-queue-max <n>", "Max tokens queued for analysis (default: 50, range: 1–500)");
}

function validateConfigOpts(opts: ConfigOpts): void {
  if (opts.market) validateMarket(opts.market);
  if (opts.maxPositionSol) validatePositiveNumber(opts.maxPositionSol, "--max-position-sol");
  if (opts.maxPositions) validateInt(opts.maxPositions, "--max-positions", 1, 50);
  if (opts.stopLoss) {
    const n = parseFloat(opts.stopLoss);
    if (!Number.isFinite(n) || n < -50 || n > -1) {
      error("--stop-loss must be between -50 and -1", "INVALID_AMOUNT");
      process.exit(1);
    }
  }
  if (opts.takeProfit) {
    const n = parseFloat(opts.takeProfit);
    if (!Number.isFinite(n) || n < 10 || n > 1000) {
      error("--take-profit must be between 10 and 1000", "INVALID_AMOUNT");
      process.exit(1);
    }
  }
  if (opts.trailingStop) {
    const n = parseFloat(opts.trailingStop);
    if (!Number.isFinite(n) || n < -50 || n > -1) {
      error("--trailing-stop must be between -50 and -1", "INVALID_AMOUNT");
      process.exit(1);
    }
  }
  if (opts.scoutInterval) validateInt(opts.scoutInterval, "--scout-interval", 10, 600);
  if (opts.riskInterval) validateInt(opts.riskInterval, "--risk-interval", 5, 300);
  if (opts.riskSlowInterval) validateInt(opts.riskSlowInterval, "--risk-slow-interval", 10, 600);
  if (opts.analystQueueMax) validateInt(opts.analystQueueMax, "--analyst-queue-max", 1, 500);
}

// ── Handlers ──

export async function handleSessionCreate(
  opts: ConfigOpts & {
    duration: string;
    llmProvider?: string;
    llmModel?: string;
    llmApiKey?: string;
    traderMd?: string;
    traderMdFile?: string;
  },
  ctx: CmdContext,
): Promise<void> {
  const client = await getAuthClient(ctx);
  const body: Record<string, unknown> = {
    durationMinutes: parseInt(opts.duration, 10),
  };
  if (opts.llmProvider) body.llmProvider = opts.llmProvider;
  if (opts.llmModel) body.llmModel = opts.llmModel;
  if (opts.llmApiKey) body.llmApiKey = opts.llmApiKey;

  const traderMd = resolveTraderMd(opts.traderMd, opts.traderMdFile);
  if (traderMd) body.traderMd = traderMd;

  const configJson = buildConfigJson(opts);
  if (configJson) body.configJson = configJson;

  const data = await client.post("/agent/sessions", body);
  successWithHint(data, `Start with: fomolt session start --id ${data.id}`);
}

export async function handleSessionList(ctx: CmdContext): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.get("/agent/sessions");
  success(data);
}

export async function handleSessionGet(
  opts: { id: string },
  ctx: CmdContext,
): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.get(`/agent/sessions/${opts.id}`);
  success(data);
}

export async function handleSessionStart(
  opts: { id: string },
  ctx: CmdContext,
): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.post(`/agent/sessions/${opts.id}/start`);

  // Display monitor URL prominently
  if (data.monitorUrl) {
    const dim = process.stderr.isTTY ? "\x1b[2m" : "";
    const bold = process.stderr.isTTY ? "\x1b[1m" : "";
    const cyan = process.stderr.isTTY ? "\x1b[36m" : "";
    const reset = process.stderr.isTTY ? "\x1b[0m" : "";
    process.stderr.write(
      `${dim}Monitor URL: ${reset}${bold}${cyan}${data.monitorUrl}${reset}\n`,
    );
    process.stderr.write(
      `${dim}Share this link to let anyone watch your session in real-time.${reset}\n`,
    );
  }

  success(data);
}

export async function handleSessionStatus(
  opts: { id: string },
  ctx: CmdContext,
): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.get(`/agent/sessions/${opts.id}/status`);
  success(data);
}

export async function handleSessionEvents(
  opts: { id: string; limit?: string; follow?: boolean; interval?: number },
  ctx: CmdContext,
  testOpts?: { once?: boolean },
): Promise<void> {
  const client = await getAuthClient(ctx);
  const limit = opts.limit ?? "50";

  let afterParam: string | undefined;
  let afterIdParam: string | undefined;

  const tick = async () => {
    const params: Record<string, string> = { limit };
    if (afterParam && afterIdParam) {
      params.after = afterParam;
      params.after_id = afterIdParam;
    }
    const data = await client.get(`/agent/sessions/${opts.id}/events`, params);
    const events = data.events ?? [];
    const cursor = data.cursor;

    for (const event of events) {
      success(event);
    }

    if (cursor) {
      afterParam = cursor.after;
      afterIdParam = cursor.after_id;
    }

    return events.length;
  };

  await tick();

  if (!opts.follow || testOpts?.once) return;

  // Follow mode: keep polling
  const intervalMs = (opts.interval ?? 3) * 1000;
  setInterval(tick, intervalMs);
}

export async function handleSessionPause(
  opts: { id: string },
  ctx: CmdContext,
): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.post(`/agent/sessions/${opts.id}/pause`);
  success(data);
}

export async function handleSessionKill(
  opts: { id: string },
  ctx: CmdContext,
): Promise<void> {
  const client = await getAuthClient(ctx);
  const data = await client.post(`/agent/sessions/${opts.id}/kill`);
  success(data);
}

export async function handleSessionEdit(
  opts: ConfigOpts & {
    id: string;
    traderMd?: string;
    traderMdFile?: string;
    duration?: string;
    llmProvider?: string;
    llmModel?: string;
    llmApiKey?: string;
  },
  ctx: CmdContext,
): Promise<void> {
  const client = await getAuthClient(ctx);
  const body: Record<string, unknown> = {};

  const traderMd = resolveTraderMd(opts.traderMd, opts.traderMdFile);
  if (traderMd !== undefined) body.traderMd = traderMd;
  if (opts.duration !== undefined) body.durationMinutes = parseInt(opts.duration, 10);
  if (opts.llmProvider !== undefined) body.llmProvider = opts.llmProvider;
  if (opts.llmModel !== undefined) body.llmModel = opts.llmModel;
  if (opts.llmApiKey !== undefined) body.llmApiKey = opts.llmApiKey;

  const configJson = buildConfigJson(opts);
  if (configJson) body.configJson = configJson;

  const data = await client.patch(`/agent/sessions/${opts.id}`, body);
  success(data);
}

// ── Command tree ──

export function sessionCommands(getContext: () => CmdContext): Command {
  const cmd = new Command("session").description(
    "Managed trading sessions — create, start, monitor, and control"
  );

  const createCmd = new Command("create")
    .description("Create a new draft session")
    .requiredOption("--duration <minutes>", "Session duration in minutes (default: 60, range: 60–300)")
    .option("--llm-provider <provider>", "LLM provider: chatjimmy (default), openai, anthropic")
    .option("--llm-model <model>", "LLM model name (default: llama3.1-8B)")
    .option("--llm-api-key <key>", "BYOK API key (required for openai/anthropic)")
    .option("--trader-md <text>", "Trading strategy as inline text")
    .option("--trader-md-file <path>", "Trading strategy from a file (e.g. ./TRADER.md)")
    .addHelpText("after", `
Examples:
  Minimal (defaults):
    fomolt session create --duration 60

  Custom risk + BYOK:
    fomolt session create --duration 120 \\
      --llm-provider openai --llm-api-key sk-... \\
      --stop-loss -15 --take-profit 50 --trailing-stop -8

  With strategy file + live trading:
    fomolt session create --duration 180 \\
      --trader-md-file ./TRADER.md --market live \\
      --max-position-sol 1.0 --max-positions 5

  With watchlist:
    fomolt session create --duration 60 \\
      --watchlist 0xabc...,0xdef...
`)
    .action(async (opts) => {
      validateInt(opts.duration, "--duration", 60, 300);
      validateConfigOpts(opts);
      return handleSessionCreate(opts, getContext());
    });
  addConfigOptions(createCmd);
  cmd.addCommand(createCmd);

  cmd
    .command("list")
    .description("List your sessions (most recent first)")
    .action(async () => handleSessionList(getContext()));

  cmd
    .command("get")
    .description("Get session details (includes monitor URL)")
    .requiredOption("--id <sessionId>", "Session ID")
    .action(async (opts) => handleSessionGet(opts, getContext()));

  cmd
    .command("start")
    .description("Start or resume a session (prints monitor URL)")
    .requiredOption("--id <sessionId>", "Session ID")
    .action(async (opts) => handleSessionStart(opts, getContext()));

  cmd
    .command("status")
    .description("Get session status")
    .requiredOption("--id <sessionId>", "Session ID")
    .action(async (opts) => handleSessionStatus(opts, getContext()));

  cmd
    .command("events")
    .description("Fetch session events (one JSON line per event)")
    .requiredOption("--id <sessionId>", "Session ID")
    .option("--limit <count>", "Events per page (1-100)", "50")
    .option("--follow", "Keep polling for new events")
    .option("--interval <seconds>", "Poll interval in follow mode (default: 3)")
    .action(async (opts) => {
      if (opts.limit) validateInt(opts.limit, "--limit", 1, 100);
      if (opts.interval) opts.interval = validateInt(opts.interval, "--interval", 1, 3600);
      return handleSessionEvents(
        { id: opts.id, limit: opts.limit, follow: opts.follow, interval: opts.interval },
        getContext(),
      );
    });

  const editCmd = new Command("edit")
    .description("Edit a draft or paused session")
    .requiredOption("--id <sessionId>", "Session ID")
    .option("--trader-md <text>", "Update trading strategy (inline text)")
    .option("--trader-md-file <path>", "Update trading strategy (read from file)")
    .option("--duration <minutes>", "Update duration (60-300)")
    .option("--llm-provider <provider>", "Update LLM provider")
    .option("--llm-model <model>", "Update LLM model")
    .option("--llm-api-key <key>", "Update BYOK key")
    .action(async (opts) => {
      if (opts.duration) validateInt(opts.duration, "--duration", 60, 300);
      validateConfigOpts(opts);
      return handleSessionEdit(opts, getContext());
    });
  addConfigOptions(editCmd);
  cmd.addCommand(editCmd);

  cmd
    .command("pause")
    .description("Pause a running session")
    .requiredOption("--id <sessionId>", "Session ID")
    .action(async (opts) => handleSessionPause(opts, getContext()));

  cmd
    .command("kill")
    .description("Terminate a session")
    .requiredOption("--id <sessionId>", "Session ID")
    .action(async (opts) => handleSessionKill(opts, getContext()));

  return cmd;
}
