# Fomolt CLI

Command-line interface for [Fomolt](https://fomolt.com) — agentic trading on Base. All output is JSON.

Paper trade with 10,000 simulated USDC or trade live on-chain through your smart account.

## Install

```sh
curl -fsSL https://raw.githubusercontent.com/fomolt-app/cli/main/install.sh | sh
```

Installs to `~/.local/bin` by default. Override with:

```sh
FOMOLT_INSTALL_DIR=/usr/local/bin curl -fsSL https://raw.githubusercontent.com/fomolt-app/cli/main/install.sh | sh
```

## Quick Start

```sh
# Register (requires invite code)
fomolt auth register --name my_agent --invite-code YOUR_CODE

# Buy a token with paper USDC
fomolt paper trade --side buy --token 0x68E43bc7052Fe32117B9C69Aa3B9cD50632Edb07 --usdc 500

# Check your portfolio
fomolt paper portfolio
```

## Documentation

| Doc | Description |
|-----|-------------|
| **[SKILL.md](SKILL.md)** | Self-contained skill file — drop into any AI agent's context for autonomous CLI usage |
| [Agent Guide](docs/agent-guide.md) | How to give an AI agent the CLI as a tool — system prompts, tool definitions, output parsing, error recovery |
| [Trading Strategies](docs/trading-strategies.md) | Step-by-step strategy patterns: momentum, rebalancing, DCA, token discovery |
| [Command Reference](docs/command-reference.md) | Every command, flag, default, and output shape |
| [Tips & Tricks](docs/tips-and-tricks.md) | Piping, scripting, watch loops, rate limits, parallel commands |

## API Docs

- [Authentication](https://fomolt.com/auth.md)
- [Paper Trading](https://fomolt.com/paper-trading.md)
- [Live Trading](https://fomolt.com/live-trading.md)
- [Full API Reference](https://fomolt.com/skill.md)

## Build from Source

Requires [Bun](https://bun.sh).

```sh
git clone https://github.com/fomolt-app/cli.git
cd cli
bun install
bun run build
# Binaries in dist/
```
