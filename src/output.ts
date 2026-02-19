export function success(data: unknown): void {
  process.stdout.write(JSON.stringify({ ok: true, data }) + "\n");
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
