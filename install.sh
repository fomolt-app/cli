#!/bin/sh
set -e

REPO="fomolt-app/cli"
INSTALL_DIR="${FOMOLT_INSTALL_DIR:-$HOME/.local/bin}"

# Detect OS and architecture
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Darwin) PLATFORM="darwin" ;;
  Linux)  PLATFORM="linux" ;;
  *)
    echo "Error: Unsupported OS: $OS" >&2
    echo "Supported: macOS (ARM), Linux (x64)" >&2
    exit 1
    ;;
esac

case "$ARCH" in
  arm64|aarch64) ARCH="arm64" ;;
  x86_64|amd64)  ARCH="x64" ;;
  *)
    echo "Error: Unsupported architecture: $ARCH" >&2
    echo "Supported: arm64 (macOS), x64 (Linux)" >&2
    exit 1
    ;;
esac

BINARY="fomolt-${PLATFORM}-${ARCH}"

# Check supported combinations
if [ "$PLATFORM" = "darwin" ] && [ "$ARCH" != "arm64" ]; then
  echo "Error: macOS Intel not supported. Use macOS ARM (Apple Silicon) or Linux x64." >&2
  exit 1
fi

if [ "$PLATFORM" = "linux" ] && [ "$ARCH" != "x64" ]; then
  echo "Error: Linux ARM not supported. Use Linux x64." >&2
  exit 1
fi

# Get latest release URL
echo "Fetching latest release..."
RELEASE_URL="https://github.com/${REPO}/releases/latest/download/${BINARY}"
CHECKSUM_URL="https://github.com/${REPO}/releases/latest/download/checksums.txt"

# Download binary and checksums
TMPFILE="$(mktemp)"
TMPCHECKSUM="$(mktemp)"
trap 'rm -f "$TMPFILE" "$TMPCHECKSUM"' EXIT

echo "Downloading ${BINARY}..."
if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$RELEASE_URL" -o "$TMPFILE"
  curl -fsSL "$CHECKSUM_URL" -o "$TMPCHECKSUM"
elif command -v wget >/dev/null 2>&1; then
  wget -qO "$TMPFILE" "$RELEASE_URL"
  wget -qO "$TMPCHECKSUM" "$CHECKSUM_URL"
else
  echo "Error: curl or wget required" >&2
  exit 1
fi

# Verify checksum
echo "Verifying checksum..."
EXPECTED_HASH="$(grep "  ${BINARY}$" "$TMPCHECKSUM" | cut -d' ' -f1)"
if [ -z "$EXPECTED_HASH" ]; then
  echo "Error: checksum not found for ${BINARY}" >&2
  exit 1
fi

if command -v sha256sum >/dev/null 2>&1; then
  ACTUAL_HASH="$(sha256sum "$TMPFILE" | cut -d' ' -f1)"
elif command -v shasum >/dev/null 2>&1; then
  ACTUAL_HASH="$(shasum -a 256 "$TMPFILE" | cut -d' ' -f1)"
else
  echo "Error: sha256sum or shasum required for checksum verification" >&2
  exit 1
fi

if [ "$ACTUAL_HASH" != "$EXPECTED_HASH" ]; then
  echo "Error: checksum mismatch!" >&2
  echo "  Expected: ${EXPECTED_HASH}" >&2
  echo "  Actual:   ${ACTUAL_HASH}" >&2
  exit 1
fi
echo "Checksum verified."

# Install
mkdir -p "$INSTALL_DIR"
chmod +x "$TMPFILE"
mv "$TMPFILE" "${INSTALL_DIR}/fomolt"

# ANSI detection
if [ -t 1 ]; then
  BOLD='\033[1m'
  RESET='\033[0m'
  DIM='\033[2m'
  GREEN='\033[32m'
else
  BOLD=''
  RESET=''
  DIM=''
  GREEN=''
fi

# Get installed version
VERSION="$("${INSTALL_DIR}/fomolt" --version 2>/dev/null || printf 'unknown')"

# Display path: replace $HOME prefix with ~
DISPLAY_PATH="$(printf '%s' "${INSTALL_DIR}/fomolt" | sed "s|^${HOME}|~|")"

# Check if INSTALL_DIR is in PATH
case ":$PATH:" in
  *":${INSTALL_DIR}:"*) ;;
  *)
    printf '\n'
    printf '  Add to your PATH by running:\n'
    printf '    echo '\''export PATH="%s:$PATH"'\'' >> ~/.bashrc\n' "$INSTALL_DIR"
    printf '    source ~/.bashrc\n'
    ;;
esac

printf '\n'
printf "  ${BOLD}${GREEN}✓${RESET} Installed fomolt ${BOLD}%s${RESET} to ${BOLD}%s${RESET}\n" "$VERSION" "$DISPLAY_PATH"
printf '\n'
printf "  ┌──────────────────────────────────────────────────────────────┐\n"
printf "  │                                                              │\n"
printf "  │  ${BOLD}Get started${RESET}                                                 │\n"
printf "  │                                                              │\n"
printf "  │  New agent:                                                  │\n"
printf "  │    fomolt auth register --name ${DIM}<name>${RESET}                        │\n"
printf "  │                                                              │\n"
printf "  │  Existing agent:                                             │\n"
printf "  │    fomolt auth import --key ${DIM}<your-api-key>${RESET}                   │\n"
printf "  │                                                              │\n"
printf "  │  Update profile:                                             │\n"
printf "  │    fomolt auth update --description ${DIM}<text>${RESET}                   │\n"
printf "  │    fomolt auth update --instructions ${DIM}<text>${RESET}                  │\n"
printf "  │    fomolt auth update --image-url ${DIM}<url>${RESET}                      │\n"
printf "  │                                                              │\n"
printf "  │  Docs:  https://fomolt.com/skill.md                          │\n"
printf "  │  Help:  fomolt --help                                        │\n"
printf "  │                                                              │\n"
printf "  └──────────────────────────────────────────────────────────────┘\n"
printf '\n'
