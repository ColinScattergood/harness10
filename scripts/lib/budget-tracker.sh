#!/bin/bash
# Budget tracking across all agent invocations

source "$(dirname "${BASH_SOURCE[0]}")/../../config.sh"

init_budget() {
  echo "0.00" > "$BUDGET_FILE"
}

add_spend() {
  local amount="$1"
  local agent="$2"
  local current
  current=$(cat "$BUDGET_FILE" 2>/dev/null || echo "0.00")
  local new_total
  new_total=$(echo "$current + $amount" | bc -l)
  echo "$new_total" > "$BUDGET_FILE"
  echo "[BUDGET] $agent: \$$amount | Total: \$$new_total / \$$TOTAL_BUDGET_CAP" >&2
}

get_total_spend() {
  cat "$BUDGET_FILE" 2>/dev/null || echo "0.00"
}

check_budget() {
  local total
  total=$(get_total_spend)
  local over
  over=$(echo "$total >= $TOTAL_BUDGET_CAP" | bc -l)
  if [ "$over" = "1" ]; then
    echo "[BUDGET] EXCEEDED: \$$total >= \$$TOTAL_BUDGET_CAP — halting harness" >&2
    return 1
  fi
  return 0
}

# Extract cost from claude --print --output-format json response
# The actual field is "total_cost_usd" (verified against claude 2.1.x)
extract_cost() {
  local json_output="$1"
  echo "$json_output" | jq -r '.total_cost_usd // 0' 2>/dev/null || echo "0"
}

# Extract additional metadata from claude output
extract_duration() {
  local json_output="$1"
  echo "$json_output" | jq -r '.duration_ms // 0' 2>/dev/null || echo "0"
}

extract_turns() {
  local json_output="$1"
  echo "$json_output" | jq -r '.num_turns // 0' 2>/dev/null || echo "0"
}
