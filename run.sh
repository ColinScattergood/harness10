#!/bin/bash
set -euo pipefail

HARNESS_ROOT="$(cd "$(dirname "$0")" && pwd)"
export HARNESS_ROOT
source "$HARNESS_ROOT/config.sh"
source "$HARNESS_ROOT/scripts/lib/budget-tracker.sh"
source "$HARNESS_ROOT/scripts/lib/git-checkpoint.sh"
source "$HARNESS_ROOT/scripts/lib/handoff.sh"
source "$HARNESS_ROOT/scripts/lib/issues.sh"

# ---------------------------------------------------------------------------
# Usage
# ---------------------------------------------------------------------------
if [ $# -lt 1 ]; then
  echo "Usage: bash run.sh \"<app idea>\" [--web-only | --ios-only]"
  echo ""
  echo "Examples:"
  echo "  bash run.sh \"A todo list app with user accounts\""
  echo "  bash run.sh \"A recipe sharing social network\" --web-only"
  exit 1
fi

USER_IDEA="$1"
PLATFORM_FILTER="${2:-both}"  # --web-only, --ios-only, or both

BUILD_WEB=true
BUILD_IOS=true
case "$PLATFORM_FILTER" in
  --web-only) BUILD_IOS=false ;;
  --ios-only) BUILD_WEB=false ;;
esac

# ---------------------------------------------------------------------------
# Preflight
# ---------------------------------------------------------------------------
bash "$HARNESS_ROOT/scripts/preflight.sh" || { echo "Preflight failed. Aborting."; exit 1; }

echo ""
echo "=============================================="
echo " HARNESS10 — Multi-Platform App Builder"
echo "=============================================="
echo " Idea: $USER_IDEA"
echo " Platforms: web=$BUILD_WEB, ios=$BUILD_IOS"
echo " Model: $MODEL"
echo " Budget cap: \$$TOTAL_BUDGET_CAP"
echo "=============================================="

# ---------------------------------------------------------------------------
# Initialize
# ---------------------------------------------------------------------------
init_budget
init_issues

# Init git repo if needed
cd "$HARNESS_ROOT"
if [ ! -d ".git" ]; then
  git init
  echo "artifacts/screenshots/" >> .gitignore
  echo "node_modules/" >> .gitignore
  echo ".env*" >> .gitignore
  echo "ios/build/" >> .gitignore
  echo "web/.next/" >> .gitignore
  git add -A
  git commit -m "Harness initialized"
fi

# ---------------------------------------------------------------------------
# Phase 1: Planning
# ---------------------------------------------------------------------------
echo ""
echo "========== PHASE 1: PLANNING =========="
bash "$HARNESS_ROOT/scripts/01-plan.sh" "$USER_IDEA"

checkpoint_commit "Product spec generated for: $USER_IDEA"

COMPLEXITY=$(jq -r '.complexity' "$SPECS_DIR/current-meta.json")
NUM_SPRINTS=$(jq -r '.sprints | length' "$SPECS_DIR/current-meta.json")
echo "Complexity: $COMPLEXITY | Sprints: $NUM_SPRINTS"

# ---------------------------------------------------------------------------
# Phase 2 & 3: Generate + Evaluate (per sprint)
# ---------------------------------------------------------------------------
for SPRINT in $(seq 1 "$NUM_SPRINTS"); do
  echo ""
  echo "========== SPRINT $SPRINT of $NUM_SPRINTS =========="

  ATTEMPT=1
  WEB_PASS=false
  IOS_PASS=false

  # Skip platforms not being built
  [ "$BUILD_WEB" = false ] && WEB_PASS=true
  [ "$BUILD_IOS" = false ] && IOS_PASS=true

  while [ $ATTEMPT -le $((MAX_RETRIES + 1)) ]; do
    check_budget || { echo "BUDGET EXCEEDED — halting"; exit 1; }

    echo ""
    echo "--- Generation (Sprint $SPRINT, Attempt $ATTEMPT) ---"

    # Generate platforms in parallel
    PIDS=()

    if [ "$WEB_PASS" = false ]; then
      echo "[HARNESS] Starting web generator..."
      bash "$HARNESS_ROOT/scripts/02-generate-web.sh" "$SPRINT" "$ATTEMPT" &
      PIDS+=($!)
    fi

    if [ "$IOS_PASS" = false ]; then
      echo "[HARNESS] Starting iOS generator..."
      bash "$HARNESS_ROOT/scripts/02-generate-ios.sh" "$SPRINT" "$ATTEMPT" &
      PIDS+=($!)
    fi

    # Wait for all generators
    FAILED=false
    for PID in "${PIDS[@]}"; do
      if ! wait "$PID"; then
        echo "[HARNESS] WARNING: A generator process failed" >&2
        FAILED=true
      fi
    done

    # Git checkpoint after generation (platform-scoped for parallel safety)
    [ "$WEB_PASS" = false ] && [ "$BUILD_WEB" = true ] && platform_commit "web" "Sprint $SPRINT: web generation (attempt $ATTEMPT)"
    [ "$IOS_PASS" = false ] && [ "$BUILD_IOS" = true ] && platform_commit "ios" "Sprint $SPRINT: ios generation (attempt $ATTEMPT)"

    echo ""
    echo "--- Evaluation (Sprint $SPRINT, Attempt $ATTEMPT) ---"

    # Evaluate platforms in parallel
    PIDS=()

    if [ "$WEB_PASS" = false ]; then
      echo "[HARNESS] Starting web evaluator..."
      bash "$HARNESS_ROOT/scripts/03-evaluate-web.sh" "$SPRINT" &
      PIDS+=($!)
    fi

    if [ "$IOS_PASS" = false ]; then
      echo "[HARNESS] Starting iOS evaluator..."
      bash "$HARNESS_ROOT/scripts/03-evaluate-ios.sh" "$SPRINT" &
      PIDS+=($!)
    fi

    # Wait for all evaluators
    for PID in "${PIDS[@]}"; do
      wait "$PID" || true
    done

    # Track issues across sprints
    [ "$BUILD_WEB" = true ] && [ "$WEB_PASS" = false ] && update_issues_after_eval "web" "$SPRINT"
    [ "$BUILD_IOS" = true ] && [ "$IOS_PASS" = false ] && update_issues_after_eval "ios" "$SPRINT"

    # Check verdicts
    if [ "$WEB_PASS" = false ]; then
      WEB_PASS=$(bash "$HARNESS_ROOT/scripts/04-verdict.sh" web "$SPRINT")
    fi

    if [ "$IOS_PASS" = false ]; then
      IOS_PASS=$(bash "$HARNESS_ROOT/scripts/04-verdict.sh" ios "$SPRINT")
    fi

    # Update issues after passing too (to carry forward for next sprint)
    [ "$BUILD_WEB" = true ] && [ "$WEB_PASS" = true ] && update_issues_after_eval "web" "$SPRINT"
    [ "$BUILD_IOS" = true ] && [ "$IOS_PASS" = true ] && update_issues_after_eval "ios" "$SPRINT"

    echo ""
    echo "--- Results (Sprint $SPRINT, Attempt $ATTEMPT) ---"
    echo "  Web: $( [ "$BUILD_WEB" = true ] && echo "$WEB_PASS" || echo "skipped" )"
    echo "  iOS: $( [ "$BUILD_IOS" = true ] && echo "$IOS_PASS" || echo "skipped" )"

    # Both passed?
    if [ "$WEB_PASS" = true ] && [ "$IOS_PASS" = true ]; then
      echo "[HARNESS] Sprint $SPRINT: ALL PLATFORMS PASSED"
      sprint_complete_tag "$SPRINT"
      break
    fi

    ATTEMPT=$((ATTEMPT + 1))
    if [ $ATTEMPT -le $((MAX_RETRIES + 1)) ]; then
      echo "[HARNESS] Retrying failed platforms..."
    else
      echo "[HARNESS] Sprint $SPRINT: Max retries exceeded. Moving on."
      sprint_complete_tag "$SPRINT"
    fi
  done
done

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "=============================================="
echo " BUILD COMPLETE"
echo "=============================================="
echo " Total spend: \$$(get_total_spend)"
echo " Sprints: $NUM_SPRINTS"
echo " Git tags:"
git tag -l "sprint-*" | sort
echo ""
echo " Web app: $( [ "$BUILD_WEB" = true ] && echo "$HARNESS_ROOT/web/" || echo "not built" )"
echo " iOS app: $( [ "$BUILD_IOS" = true ] && echo "$HARNESS_ROOT/ios/" || echo "not built" )"
echo "=============================================="
