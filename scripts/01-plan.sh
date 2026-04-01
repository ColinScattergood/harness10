#!/bin/bash
set -euo pipefail
source "$(dirname "$0")/../config.sh"
source "$HARNESS_ROOT/scripts/lib/budget-tracker.sh"

USER_IDEA="$1"

echo "[PLANNER] Generating product spec for: $USER_IDEA" >&2

PROMPT="Create a product specification for the following app idea. Working directory: $HARNESS_ROOT

Write these files:
1. $HARNESS_ROOT/artifacts/specs/current-spec.md — full product spec
2. $HARNESS_ROOT/artifacts/specs/current-meta.json — JSON metadata
3. Sprint contract files: $HARNESS_ROOT/artifacts/contracts/web-sprint-{N}.json and $HARNESS_ROOT/artifacts/contracts/ios-sprint-{N}.json for each sprint

The templates directory at $HARNESS_ROOT/templates/ has format examples (especially sprint-contract.json).

App idea: $USER_IDEA"

RESULT=$(echo "$PROMPT" | "$CLAUDE_BIN" --print \
  --model "$MODEL" \
  --system-prompt "$(cat "$PROMPTS_DIR/planner.md")" \
  --output-format json \
  --permission-mode bypassPermissions \
  --dangerously-skip-permissions \
  --allowedTools "Read,Write,Edit,Bash,Glob,Grep")

# Track cost
COST=$(extract_cost "$RESULT")
add_spend "$COST" "planner"

# Verify outputs exist
if [ ! -f "$SPECS_DIR/current-spec.md" ]; then
  echo "[PLANNER] ERROR: Spec file not created at $SPECS_DIR/current-spec.md" >&2
  echo "$RESULT" | jq -r '.result // .text // empty' > "$SPECS_DIR/current-spec.md"
fi

if [ ! -f "$SPECS_DIR/current-meta.json" ]; then
  echo "[PLANNER] WARNING: Metadata file not created, generating default" >&2
  echo '{"complexity": 2, "sprints": [{"number": 1, "title": "Full Build", "scope": "All features", "done_conditions": []}], "shared_backend": true}' > "$SPECS_DIR/current-meta.json"
fi

COMPLEXITY=$(jq -r '.complexity' "$SPECS_DIR/current-meta.json")
NUM_SPRINTS=$(jq -r '.sprints | length' "$SPECS_DIR/current-meta.json")

# Verify sprint contracts were generated
CONTRACTS_FOUND=0
for i in $(seq 1 "$NUM_SPRINTS"); do
  [ -f "$CONTRACTS_DIR/web-sprint-${i}.json" ] && CONTRACTS_FOUND=$((CONTRACTS_FOUND + 1))
  [ -f "$CONTRACTS_DIR/ios-sprint-${i}.json" ] && CONTRACTS_FOUND=$((CONTRACTS_FOUND + 1))
done
echo "[PLANNER] Spec complete — Complexity: $COMPLEXITY, Sprints: $NUM_SPRINTS, Contracts: $CONTRACTS_FOUND" >&2
if [ "$CONTRACTS_FOUND" -eq 0 ]; then
  echo "[PLANNER] WARNING: No sprint contracts generated. Generators will rely on spec only." >&2
fi
