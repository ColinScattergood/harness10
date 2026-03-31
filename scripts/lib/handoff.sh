#!/bin/bash
# Handoff document helpers

source "$(dirname "${BASH_SOURCE[0]}")/../../config.sh"

get_handoff_path() {
  local platform="$1"
  local sprint="$2"
  echo "$HANDOFFS_DIR/${platform}-handoff-${sprint}.json"
}

handoff_exists() {
  local platform="$1"
  local sprint="$2"
  [ -f "$(get_handoff_path "$platform" "$sprint")" ]
}

get_eval_path() {
  local platform="$1"
  local sprint="$2"
  echo "$EVALS_DIR/${platform}-eval-${sprint}.json"
}

eval_exists() {
  local platform="$1"
  local sprint="$2"
  [ -f "$(get_eval_path "$platform" "$sprint")" ]
}

get_contract_path() {
  local platform="$1"
  local sprint="$2"
  echo "$CONTRACTS_DIR/${platform}-sprint-${sprint}.json"
}

contract_exists() {
  local platform="$1"
  local sprint="$2"
  [ -f "$(get_contract_path "$platform" "$sprint")" ]
}

get_how_to_run() {
  local platform="$1"
  local sprint="$2"
  local handoff
  handoff=$(get_handoff_path "$platform" "$sprint")
  if [ -f "$handoff" ]; then
    jq -r '.how_to_run // empty' "$handoff" 2>/dev/null
  fi
}
