#!/bin/bash
# Parse evaluation report and return pass/fail
source "$(dirname "$0")/../config.sh"

PLATFORM="$1"
SPRINT="$2"
EVAL_FILE="$HARNESS_ROOT/artifacts/evaluations/${PLATFORM}-eval-${SPRINT}.json"

if [ ! -f "$EVAL_FILE" ]; then
  echo "[VERDICT] No evaluation file found at $EVAL_FILE" >&2
  echo "false"
  exit 0
fi

# Extract scores
FUNC=$(jq -r '.scores.functionality // 0' "$EVAL_FILE")
DESIGN=$(jq -r '.scores.design_quality // 0' "$EVAL_FILE")
CRAFT=$(jq -r '.scores.craft // 0' "$EVAL_FILE")
ORIG=$(jq -r '.scores.originality // 0' "$EVAL_FILE")

# Calculate average
AVG=$(echo "scale=2; ($FUNC + $DESIGN + $CRAFT + $ORIG) / 4" | bc -l)

# Check pass criteria: functionality >= 7 AND average >= 6.5
FUNC_OK=$(echo "$FUNC >= 7" | bc -l)
AVG_OK=$(echo "$AVG >= 6.5" | bc -l)

echo "[VERDICT] $PLATFORM sprint $SPRINT — Func: $FUNC, Design: $DESIGN, Craft: $CRAFT, Orig: $ORIG, Avg: $AVG" >&2

if [ "$FUNC_OK" = "1" ] && [ "$AVG_OK" = "1" ]; then
  echo "[VERDICT] PASS" >&2
  echo "true"
else
  REASONS=""
  [ "$FUNC_OK" != "1" ] && REASONS="functionality $FUNC < 7"
  [ "$AVG_OK" != "1" ] && REASONS="$REASONS${REASONS:+, }average $AVG < 6.5"
  echo "[VERDICT] FAIL ($REASONS)" >&2
  echo "false"
fi
