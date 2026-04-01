#!/bin/bash
set -euo pipefail
source "$(dirname "$0")/../config.sh"
source "$HARNESS_ROOT/scripts/lib/budget-tracker.sh"
source "$HARNESS_ROOT/scripts/lib/handoff.sh"
source "$HARNESS_ROOT/scripts/lib/issues.sh"
source "$HARNESS_ROOT/scripts/lib/sim-control.sh"

SPRINT="${1:-1}"

echo "[EVAL-iOS] Evaluating sprint $SPRINT" >&2

check_budget || exit 1

# Boot simulator
boot_simulator

# Read handoff to get scheme and bundle ID
HANDOFF_FILE="$(get_handoff_path "ios" "$SPRINT")"
if [ -f "$HANDOFF_FILE" ]; then
  SCHEME=$(jq -r '.scheme // "App"' "$HANDOFF_FILE")
  BUNDLE_ID=$(jq -r '.bundle_id // "com.example.app"' "$HANDOFF_FILE")
else
  echo "[EVAL-iOS] WARNING: No handoff file found, using defaults" >&2
  SCHEME="App"
  BUNDLE_ID="com.example.app"
fi

# Build, install, and launch
echo "[EVAL-iOS] Building scheme: $SCHEME" >&2
build_ios_app "$SCHEME" || echo "[EVAL-iOS] WARNING: Build had issues" >&2
install_app || echo "[EVAL-iOS] WARNING: Install had issues" >&2
launch_app "$BUNDLE_ID" || echo "[EVAL-iOS] WARNING: Launch had issues" >&2

PROMPT="Evaluate the iOS application for sprint $SPRINT.

The app should be running in the iOS Simulator ($IOS_SIMULATOR_NAME).

Read these files for context:
- Product spec: $HARNESS_ROOT/artifacts/specs/current-spec.md
- Handoff document: $HANDOFF_FILE
- Sprint contract (if exists): $HARNESS_ROOT/artifacts/contracts/ios-sprint-${SPRINT}.json
- Evaluation report template: $HARNESS_ROOT/templates/eval-report.json

Test every feature by interacting with the Simulator. Take a screenshot BEFORE every interaction. Save your evaluation report to: $HARNESS_ROOT/artifacts/evaluations/ios-eval-${SPRINT}.json

Save screenshots to: $HARNESS_ROOT/artifacts/screenshots/

Remember: Score FIRST, rationale SECOND. Every issue must be reflected in the scores.
$(get_carried_issues "ios" "$SPRINT")"

RESULT=$(echo "$PROMPT" | "$CLAUDE_BIN" --print \
  --model "$MODEL" \
  --system-prompt "$(cat "$PROMPTS_DIR/evaluator-ios.md")" \
  --output-format json \
  --permission-mode bypassPermissions \
  --dangerously-skip-permissions \
  --allowedTools "Read,Write,Edit,Bash,Glob,Grep,mcp__computer-use__screenshot,mcp__computer-use__left_click,mcp__computer-use__type,mcp__computer-use__key,mcp__computer-use__scroll,mcp__computer-use__open_application,mcp__computer-use__mouse_move,mcp__computer-use__double_click,mcp__computer-use__cursor_position")

COST=$(extract_cost "$RESULT")
add_spend "$COST" "eval-ios-s${SPRINT}"

echo "[EVAL-iOS] Complete — Sprint $SPRINT" >&2
