#!/bin/bash
set -euo pipefail
source "$(dirname "$0")/../config.sh"
source "$HARNESS_ROOT/scripts/lib/budget-tracker.sh"
source "$HARNESS_ROOT/scripts/lib/handoff.sh"

SPRINT="${1:-1}"
ATTEMPT="${2:-1}"

echo "[GEN-WEB] Sprint $SPRINT, Attempt $ATTEMPT" >&2

check_budget || exit 1

# Build the prompt with context
PROMPT="Build the web application for sprint $SPRINT (attempt $ATTEMPT).

Working directory: $HARNESS_ROOT/web
Product spec: $HARNESS_ROOT/artifacts/specs/current-spec.md
Templates directory: $HARNESS_ROOT/templates/"

# Add sprint contract if it exists
if contract_exists "web" "$SPRINT"; then
  PROMPT="$PROMPT

Sprint contract: $(cat "$(get_contract_path "web" "$SPRINT")")"
fi

# Add evaluation feedback if this is a retry
if [ "$ATTEMPT" -gt 1 ] && eval_exists "web" "$SPRINT"; then
  PROMPT="$PROMPT

PREVIOUS EVALUATION FAILED. Read the evaluation report at $(get_eval_path "web" "$SPRINT") and fix ALL issues listed. Focus especially on issues marked severity 'high'. Do not re-implement working features — only fix what is broken.

The evaluator captured screenshots showing the issues. Look at the screenshot files referenced in the evaluation report (in $HARNESS_ROOT/artifacts/screenshots/) — use the Read tool to view them so you can SEE what the evaluator saw."
fi

PROMPT="$PROMPT

When done, write your handoff document to $HARNESS_ROOT/artifacts/handoffs/web-handoff-${SPRINT}.json following the schema in $HARNESS_ROOT/templates/handoff.json."

RESULT=$(echo "$PROMPT" | "$CLAUDE_BIN" --print \
  --model "$MODEL" \
  --system-prompt "$(cat "$PROMPTS_DIR/generator-web.md")" \
  --output-format json \
  --permission-mode bypassPermissions \
  --dangerously-skip-permissions \
  --allowedTools "Read,Write,Edit,Bash,Glob,Grep,Agent")

COST=$(extract_cost "$RESULT")
add_spend "$COST" "gen-web-s${SPRINT}-a${ATTEMPT}"

echo "[GEN-WEB] Complete — Sprint $SPRINT, Attempt $ATTEMPT" >&2
