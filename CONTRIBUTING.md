# Contributing

Guide for contributing to the Fomolt CLI.

## Prerequisites

- [Bun](https://bun.sh) (latest stable)
- A GitHub account with access to [fomolt-app/cli](https://github.com/fomolt-app/cli)

## Setup

```sh
git clone https://github.com/fomolt-app/cli.git
cd cli
bun install
```

## Project Structure

```
index.ts              Entry point — Commander program, global flags, subcommand registration
src/
  client.ts           HTTP client (FomoltClient, ApiError)
  config.ts           Credentials and config file I/O
  context.ts          CmdContext type, getAuthClient helper
  output.ts           success() and error() JSON output functions
  validate.ts         Input validation (integers, addresses, limits, slippage)
  commands/
    auth.ts           Authentication (register, import, recover, init, me, update)
    paper.ts          Paper trading (price, trade, portfolio, trades, performance, pnl-image)
    live.ts           Live on-chain trading (tokens, quote, trade, withdraw, balance, portfolio)
    watch.ts          Polling loops (portfolio, price)
    copy.ts           Copy trading
    social.ts         Achievements, leaderboard
    feed.ts           Public trade feed, spec
    agent.ts          Public agent profiles and trade history
    config.ts         CLI config management
    update.ts         Self-update
    skill.ts          SKILL.md management
tests/
  *.test.ts           Module-level tests (client, config, output, validate)
  commands/*.test.ts  Per-command tests
scripts/
  build.ts            Compile binaries for macOS arm64 and Linux x64
  release.ts          Automated release: bump, test, PR, merge, build, publish
docs/
  command-reference.md
  agent-guide.md
  trading-strategies.md
  tips-and-tricks.md
SKILL.md              Self-contained skill file for AI agents
```

## Development Workflow

### Running Locally

```sh
bun index.ts paper portfolio
bun --hot index.ts          # HMR for development
```

### Running Tests

```sh
bun test                    # All tests
bun test tests/validate     # Specific file
bun test --watch            # Watch mode
```

All tests use `bun:test`. The pattern for command tests is:

1. Mock `process.stdout.write` to capture JSON output
2. Mock `globalThis.fetch` to return canned API responses
3. Call the exported handler function directly (e.g. `handlePaperTrade(opts, ctx)`)
4. Assert on the captured JSON

Handler functions are tested directly — not through Commander — so CLI flag parsing and validation in `.action()` closures don't interfere with handler tests.

### Building Binaries

```sh
bun run build               # Outputs to dist/
```

Produces `fomolt-darwin-arm64` and `fomolt-linux-x64`.

## Adding a New Command

1. Create `src/commands/<name>.ts` with:
   - An exported async handler function (e.g. `handleFoo(opts, ctx)`)
   - An exported Commander builder function (e.g. `fooCommands(getContext)`)
2. Register it in `index.ts` with `program.addCommand(...)`
3. Add tests in `tests/commands/<name>.test.ts`
4. Document in `SKILL.md` and `docs/command-reference.md`

### Conventions

- **Output**: Use `success(data)` for stdout and `error(msg, code)` for stderr. Never use `console.log` in command handlers.
- **Validation**: Validate all numeric/address flags in the `.action()` closure using helpers from `src/validate.ts`. This keeps handlers clean and testable.
- **Auth**: Use `getAuthClient(ctx)` for authenticated commands. Use `new FomoltClient({ apiUrl })` for unauthenticated commands.
- **Handler signatures**: `(opts, ctx)` where `opts` is a typed object and `ctx` is `CmdContext`. Add `testOpts?: { once?: boolean }` for long-running commands (watch, copy).

## Adding a Validator

Add the function to `src/validate.ts` following the existing pattern:

1. Parse the string input
2. Check constraints (use `Number.isFinite` not `isNaN` to reject Infinity)
3. On failure: call `error(msg, "VALIDATION_ERROR")` then `process.exit(1)`
4. On success: return the parsed value
5. Add tests in `tests/validate.test.ts` covering valid, invalid, boundary, and edge cases

## Code Style

- TypeScript with `strict: true`
- No linter/formatter configured — match the style of surrounding code
- Prefer explicit types on exported function signatures
- Use `Record<string, string>` for query param objects, `Record<string, unknown>` for request bodies
- No `dotenv` — Bun loads `.env` automatically
- No `express` — this is a CLI, not a server

## Branching and Releases

### Manual PR

```sh
git checkout -b feat/my-feature
# Make changes, add tests
bun test
git add <files>
git commit -m "feat: description"
git push -u origin feat/my-feature
gh pr create
```

PRs are squash-merged into `main`. Branch protection requires admin merge.

### Automated Release

The release script handles everything: version bump, tests, PR, merge, binary build, checksums, and GitHub release.

```sh
GH_TOKEN=<pat> bun run scripts/release.ts patch   # 1.6.3 → 1.6.4
GH_TOKEN=<pat> bun run scripts/release.ts minor   # 1.6.3 → 1.7.0
GH_TOKEN=<pat> bun run scripts/release.ts major   # 1.6.3 → 2.0.0
```

Requires `GH_TOKEN` with repo + admin push access. Must be on `main` with a clean working tree.

### Version Locations

Version is stored in three places (the release script updates all three):

- `package.json` — `"version"`
- `index.ts` — `.version("x.y.z")`
- `src/commands/update.ts` — `const VERSION = "x.y.z"`

## Documentation

| File | Purpose | When to Update |
|------|---------|----------------|
| `SKILL.md` | AI agent skill file — self-contained CLI reference | New commands, flags, constraints, error codes |
| `docs/command-reference.md` | Complete flag/default/output reference | New commands, flags, defaults |
| `docs/agent-guide.md` | System prompts, tool definitions, error recovery | New error codes, auth changes |
| `docs/trading-strategies.md` | Strategy patterns and examples | New trading features |
| `docs/tips-and-tricks.md` | Scripting patterns, piping, rate limits | New CLI behaviors |
| `README.md` | Quick start, install, doc index | Major features, install changes |
