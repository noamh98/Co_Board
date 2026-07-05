#!/bin/bash
# SessionStart hook — Claude Code on the web (remote sessions).
# Installs npm dependencies for app/ and functions/ so typecheck, lint,
# vitest and the functions build all work from the first turn.
# Sync mode (no async JSON line): guarantees deps exist before the agent
# starts running tests. Idempotent — `npm install` is a fast no-op when
# node_modules is already present (container state is cached between runs).
set -euo pipefail

# Local (desktop/CLI) sessions manage their own node_modules — skip.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo "session-start: installing app dependencies…"
npm install --prefix "$CLAUDE_PROJECT_DIR/app" --no-audit --no-fund

echo "session-start: installing functions dependencies…"
npm install --prefix "$CLAUDE_PROJECT_DIR/functions" --no-audit --no-fund

# NOTE: Playwright browsers are pre-installed in the remote image at
# /opt/pw-browsers (PLAYWRIGHT_BROWSERS_PATH is set) — do NOT run
# `npx playwright install` here. `npm run test:rules` additionally needs
# Java + the Firestore emulator; that stays on-demand, not in this hook.
echo "session-start: done."
