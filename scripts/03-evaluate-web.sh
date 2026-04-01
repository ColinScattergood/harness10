#!/bin/bash
set -euo pipefail
source "$(dirname "$0")/../config.sh"
source "$HARNESS_ROOT/scripts/lib/budget-tracker.sh"
source "$HARNESS_ROOT/scripts/lib/handoff.sh"
source "$HARNESS_ROOT/scripts/lib/issues.sh"

SPRINT="${1:-1}"

echo "[EVAL-WEB] Evaluating sprint $SPRINT" >&2

check_budget || exit 1

# Start the web dev server in background if not already running
if ! lsof -i ":$WEB_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "[EVAL-WEB] Starting dev server on port $WEB_PORT" >&2
  cd "$HARNESS_ROOT/web"
  if [ -f "package.json" ]; then
    npm run dev -- --port "$WEB_PORT" &
    DEV_PID=$!
    sleep 5
    echo "[EVAL-WEB] Dev server started (PID: $DEV_PID)" >&2
  else
    echo "[EVAL-WEB] ERROR: No package.json in web/ — nothing to evaluate" >&2
    exit 1
  fi
fi

PROMPT="Evaluate the web application for sprint $SPRINT.

The app is running at http://localhost:$WEB_PORT

Read these files for context:
- Product spec: $HARNESS_ROOT/artifacts/specs/current-spec.md
- Handoff document: $HARNESS_ROOT/artifacts/handoffs/web-handoff-${SPRINT}.json
- Sprint contract (if exists): $HARNESS_ROOT/artifacts/contracts/web-sprint-${SPRINT}.json
- Evaluation report template: $HARNESS_ROOT/templates/eval-report.json

Test every feature and done condition. Take screenshots. Save your evaluation report to: $HARNESS_ROOT/artifacts/evaluations/web-eval-${SPRINT}.json

Save screenshots to: $HARNESS_ROOT/artifacts/screenshots/

Remember: Score FIRST, rationale SECOND. Every issue must be reflected in the scores.
$(get_carried_issues "web" "$SPRINT")"

RESULT=$(echo "$PROMPT" | "$CLAUDE_BIN" --print \
  --model "$MODEL" \
  --system-prompt "$(cat "$PROMPTS_DIR/evaluator-web.md")" \
  --output-format json \
  --permission-mode bypassPermissions \
  --dangerously-skip-permissions \
  --allowedTools "Read,Write,Edit,Bash,Glob,Grep,mcp__Claude_Preview__preview_start,mcp__Claude_Preview__preview_screenshot,mcp__Claude_Preview__preview_click,mcp__Claude_Preview__preview_fill,mcp__Claude_Preview__preview_eval,mcp__Claude_Preview__preview_console_logs,mcp__Claude_Preview__preview_network,mcp__Claude_Preview__preview_inspect,mcp__Claude_Preview__preview_snapshot,mcp__Claude_Preview__preview_resize")

COST=$(extract_cost "$RESULT")
add_spend "$COST" "eval-web-s${SPRINT}"

# Kill dev server if we started it
if [ -n "${DEV_PID:-}" ]; then
  kill "$DEV_PID" 2>/dev/null || true
fi

echo "[EVAL-WEB] Complete — Sprint $SPRINT" >&2
