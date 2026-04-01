#!/bin/bash
# Preflight checks — run before the harness starts to catch issues early
set -euo pipefail

source "$(dirname "$0")/../config.sh"

ERRORS=0
WARNINGS=0

check() {
  local label="$1" cmd="$2" min_version="${3:-}"
  if ! command -v "$cmd" &>/dev/null; then
    echo "[FAIL] $label: '$cmd' not found" >&2
    ERRORS=$((ERRORS + 1))
    return
  fi
  echo "[ OK ] $label: $(command -v "$cmd")" >&2
}

check_version() {
  local label="$1" cmd="$2" min_major="$3" min_minor="$4"
  local version
  version=$("$cmd" --version 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
  if [ -z "$version" ]; then
    echo "[WARN] $label: could not detect version" >&2
    WARNINGS=$((WARNINGS + 1))
    return
  fi
  local major minor
  major=$(echo "$version" | cut -d. -f1)
  minor=$(echo "$version" | cut -d. -f2)
  if [ "$major" -lt "$min_major" ] || { [ "$major" -eq "$min_major" ] && [ "$minor" -lt "$min_minor" ]; }; then
    echo "[FAIL] $label: version $version < required $min_major.$min_minor" >&2
    ERRORS=$((ERRORS + 1))
  else
    echo "[ OK ] $label: version $version (>= $min_major.$min_minor)" >&2
  fi
}

echo "=== Harness10 Preflight Checks ===" >&2
echo "" >&2

# Required tools
echo "--- Required Tools ---" >&2
check "Claude CLI" "$CLAUDE_BIN"
check "Node.js" "node"
check "npm" "npm"
check "git" "git"
check "jq" "jq"
check "bc" "bc"
check "python3" "python3"

echo "" >&2
echo "--- Version Checks ---" >&2
check_version "Node.js" "node" 20 9
check_version "Claude CLI" "$CLAUDE_BIN" 2 0

echo "" >&2
echo "--- Claude CLI Features ---" >&2
# Verify --print and --output-format json work
if "$CLAUDE_BIN" --help 2>&1 | grep -q "\-\-print"; then
  echo "[ OK ] claude --print supported" >&2
else
  echo "[FAIL] claude --print not supported" >&2
  ERRORS=$((ERRORS + 1))
fi

if "$CLAUDE_BIN" --help 2>&1 | grep -q "output-format"; then
  echo "[ OK ] claude --output-format supported" >&2
else
  echo "[FAIL] claude --output-format not supported" >&2
  ERRORS=$((ERRORS + 1))
fi

if "$CLAUDE_BIN" --help 2>&1 | grep -q "dangerously-skip-permissions"; then
  echo "[ OK ] claude --dangerously-skip-permissions supported" >&2
else
  echo "[WARN] claude --dangerously-skip-permissions not found — agents may prompt for permissions" >&2
  WARNINGS=$((WARNINGS + 1))
fi

echo "" >&2
echo "--- MCP Servers ---" >&2
# Check if Claude Preview MCP is configured (for web evaluator)
if "$CLAUDE_BIN" mcp list 2>&1 | grep -qi "preview\|Claude_Preview"; then
  echo "[ OK ] Claude Preview MCP configured" >&2
else
  echo "[WARN] Claude Preview MCP not detected — web evaluator may not be able to take screenshots" >&2
  WARNINGS=$((WARNINGS + 1))
fi

# Check if Computer Use MCP is configured (for iOS evaluator)
if "$CLAUDE_BIN" mcp list 2>&1 | grep -qi "computer.use\|computer-use"; then
  echo "[ OK ] Computer Use MCP configured" >&2
else
  echo "[WARN] Computer Use MCP not detected — iOS evaluator may not be able to interact with simulator" >&2
  WARNINGS=$((WARNINGS + 1))
fi

echo "" >&2
echo "--- iOS Toolchain ---" >&2
if command -v xcrun &>/dev/null; then
  echo "[ OK ] xcrun available" >&2
  # Check simulator availability
  if [ -n "${IOS_SIMULATOR_UDID:-}" ]; then
    if xcrun simctl list devices 2>/dev/null | grep -q "$IOS_SIMULATOR_UDID"; then
      echo "[ OK ] Simulator $IOS_SIMULATOR_NAME ($IOS_SIMULATOR_UDID) available" >&2
    else
      echo "[WARN] Simulator UDID $IOS_SIMULATOR_UDID not found" >&2
      WARNINGS=$((WARNINGS + 1))
    fi
  else
    # Try to auto-detect
    local_udid=$(xcrun simctl list devices available -j 2>/dev/null | jq -r '.devices | to_entries[] | select(.key | contains("iOS")) | .value[] | select(.name == "'"$IOS_SIMULATOR_NAME"'") | .udid' 2>/dev/null | head -1)
    if [ -n "$local_udid" ]; then
      echo "[ OK ] Simulator auto-detected: $IOS_SIMULATOR_NAME ($local_udid)" >&2
      echo "[INFO] Set IOS_SIMULATOR_UDID=$local_udid in config.sh" >&2
    else
      echo "[WARN] No simulator matching '$IOS_SIMULATOR_NAME' found. iOS builds will fail." >&2
      WARNINGS=$((WARNINGS + 1))
    fi
  fi
else
  echo "[WARN] xcrun not available — iOS builds will not work" >&2
  WARNINGS=$((WARNINGS + 1))
fi

echo "" >&2
echo "--- Directory Structure ---" >&2
for dir in artifacts/specs artifacts/handoffs artifacts/contracts artifacts/evaluations artifacts/screenshots prompts templates; do
  if [ -d "$HARNESS_ROOT/$dir" ]; then
    echo "[ OK ] $dir/" >&2
  else
    echo "[FAIL] $dir/ missing" >&2
    ERRORS=$((ERRORS + 1))
  fi
done

echo "" >&2
echo "--- Prompt Files ---" >&2
for prompt in planner generator-web generator-ios evaluator-web evaluator-ios; do
  if [ -f "$PROMPTS_DIR/$prompt.md" ]; then
    echo "[ OK ] prompts/$prompt.md" >&2
  else
    echo "[FAIL] prompts/$prompt.md missing" >&2
    ERRORS=$((ERRORS + 1))
  fi
done

# Summary
echo "" >&2
echo "===================================" >&2
if [ $ERRORS -gt 0 ]; then
  echo "PREFLIGHT FAILED: $ERRORS errors, $WARNINGS warnings" >&2
  echo "Fix the errors above before running the harness." >&2
  exit 1
else
  echo "PREFLIGHT PASSED: 0 errors, $WARNINGS warnings" >&2
  exit 0
fi
