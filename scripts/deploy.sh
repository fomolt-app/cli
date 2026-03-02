#!/usr/bin/env bash
set -euo pipefail

# deploy.sh — commit, PR, merge, and release in one shot.
#
# Usage:
#   ./scripts/deploy.sh <patch|minor|major> "commit message"
#
# Requires GH_TOKEN in env (or ../.env) with repo + admin push access.

# --- Load GH_TOKEN from root .env if not already set ---
if [[ -z "${GH_TOKEN:-}" ]]; then
  ENV_FILE="$(cd "$(dirname "$0")/../.." && pwd)/.env"
  if [[ -f "$ENV_FILE" ]]; then
    GH_TOKEN=$(grep '^GH_TOKEN=' "$ENV_FILE" | cut -d= -f2-)
    export GH_TOKEN
  fi
fi

if [[ -z "${GH_TOKEN:-}" ]]; then
  echo "ERROR: GH_TOKEN not set and not found in .env" >&2
  exit 1
fi

# --- Args ---
BUMP="${1:-}"
shift || true
MSG="${*:-}"

if [[ -z "$BUMP" ]] || ! [[ "$BUMP" =~ ^(patch|minor|major)$ ]]; then
  echo "Usage: ./scripts/deploy.sh <patch|minor|major> \"commit message\"" >&2
  exit 1
fi

if [[ -z "$MSG" ]]; then
  echo "ERROR: commit message required" >&2
  echo "Usage: ./scripts/deploy.sh <patch|minor|major> \"commit message\"" >&2
  exit 1
fi

# --- Ensure on main with changes to commit ---
BRANCH=$(git branch --show-current)
if [[ "$BRANCH" != "main" ]]; then
  echo "ERROR: must be on main (currently on $BRANCH)" >&2
  exit 1
fi

if [[ -z "$(git status --porcelain)" ]]; then
  echo "ERROR: no changes to commit" >&2
  exit 1
fi

# --- Slugify commit message into branch name ---
SLUG=$(echo "$MSG" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//' | cut -c1-50)
FEATURE_BRANCH="feat/$SLUG"

echo ""
echo "  deploy: $MSG"
echo "  branch: $FEATURE_BRANCH"
echo "  bump:   $BUMP"
echo ""

# --- Commit & push ---
git checkout -b "$FEATURE_BRANCH"
git add -A
git commit -m "$MSG

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

git push -u origin "$FEATURE_BRANCH"

# --- PR & merge ---
PR_URL=$(gh pr create --title "$MSG" --body "Automated deploy via deploy.sh.

Bump: \`$BUMP\`")
echo "  PR: $PR_URL"

PR_NUMBER=$(echo "$PR_URL" | grep -o '[0-9]*$')
gh pr merge "$PR_NUMBER" --squash --delete-branch --admin

# --- Back to main ---
git checkout main
git pull --rebase origin main

# --- Release ---
echo ""
echo "  Running release ($BUMP)..."
echo ""
bun run scripts/release.ts "$BUMP"
