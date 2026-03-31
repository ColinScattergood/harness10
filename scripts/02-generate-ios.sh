#!/bin/bash
set -euo pipefail
source "$(dirname "$0")/../config.sh"
source "$HARNESS_ROOT/scripts/lib/budget-tracker.sh"
source "$HARNESS_ROOT/scripts/lib/handoff.sh"

SPRINT="${1:-1}"
ATTEMPT="${2:-1}"

echo "[GEN-iOS] Sprint $SPRINT, Attempt $ATTEMPT" >&2

check_budget || exit 1

PROMPT="Build the iOS application for sprint $SPRINT (attempt $ATTEMPT).

Working directory: $HARNESS_ROOT/ios
Product spec: $HARNESS_ROOT/artifacts/specs/current-spec.md
Templates directory: $HARNESS_ROOT/templates/"

if contract_exists "ios" "$SPRINT"; then
  PROMPT="$PROMPT

Sprint contract: $(cat "$(get_contract_path "ios" "$SPRINT")")"
fi

if [ "$ATTEMPT" -gt 1 ] && eval_exists "ios" "$SPRINT"; then
  PROMPT="$PROMPT

PREVIOUS EVALUATION FAILED. Read the evaluation report at $(get_eval_path "ios" "$SPRINT") and fix ALL issues listed. Focus especially on issues marked severity 'high'. Do not re-implement working features — only fix what is broken."
fi

PROMPT="$PROMPT

When done, write your handoff document to $HARNESS_ROOT/artifacts/handoffs/ios-handoff-${SPRINT}.json following the schema in $HARNESS_ROOT/templates/handoff.json."

RESULT=$(echo "$PROMPT" | "$CLAUDE_BIN" --print \
  --model "$MODEL" \
  --system-prompt "$(cat "$PROMPTS_DIR/generator-ios.md")" \
  --output-format json \
  --permission-mode bypassPermissions \
  --dangerously-skip-permissions \
  --allowedTools "Read,Write,Edit,Bash,Glob,Grep,Agent")

COST=$(extract_cost "$RESULT")
add_spend "$COST" "gen-ios-s${SPRINT}-a${ATTEMPT}"

echo "[GEN-iOS] Complete — Sprint $SPRINT, Attempt $ATTEMPT" >&2
