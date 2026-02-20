export function success(data: unknown): void {
  process.stdout.write(JSON.stringify({ ok: true, data }) + "\n");
  if (data && typeof data === "object" && "hint" in data && (data as Record<string, unknown>).hint) {
    const hint = String((data as Record<string, unknown>).hint);
    const dim = process.stderr.isTTY ? "\x1b[2m" : "";
    const reset = process.stderr.isTTY ? "\x1b[0m" : "";
    process.stderr.write(`${dim}${hint}${reset}\n`);
  }
}

export function error(
  message: string,
  code: string,
  extra?: Record<string, unknown>
): void {
  process.stderr.write(
    JSON.stringify({ ok: false, error: message, code, ...extra }) + "\n"
  );
}
