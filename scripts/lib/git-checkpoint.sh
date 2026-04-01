#!/bin/bash
# Git checkpoint helpers for sprint boundaries

source "$(dirname "${BASH_SOURCE[0]}")/../../config.sh"

# General commit — stages everything (use only when generators are NOT running in parallel)
checkpoint_commit() {
  local message="$1"
  cd "$HARNESS_ROOT"
  git add -A
  if ! git diff --cached --quiet 2>/dev/null; then
    git commit -m "$message"
    echo "[GIT] Committed: $message" >&2
  else
    echo "[GIT] No changes to commit" >&2
  fi
}

# Platform-scoped commit — only stages files for a specific platform
# Safe to call from parallel generators
platform_commit() {
  local platform="$1"
  local message="$2"
  cd "$HARNESS_ROOT"

  # Stage platform-specific directories
  case "$platform" in
    web)
      git add web/ artifacts/handoffs/web-*.json artifacts/contracts/web-*.json 2>/dev/null || true
      ;;
    ios)
      git add ios/ artifacts/handoffs/ios-*.json artifacts/contracts/ios-*.json 2>/dev/null || true
      ;;
    *)
      git add -A
      ;;
  esac

  if ! git diff --cached --quiet 2>/dev/null; then
    git commit -m "$message"
    echo "[GIT] Committed ($platform): $message" >&2
  else
    echo "[GIT] No changes to commit ($platform)" >&2
  fi
}

# Evaluation commit — stages eval artifacts for a platform
eval_commit() {
  local platform="$1"
  local message="$2"
  cd "$HARNESS_ROOT"
  git add "artifacts/evaluations/${platform}-eval-"*.json artifacts/screenshots/ artifacts/unresolved-issues.json 2>/dev/null || true
  if ! git diff --cached --quiet 2>/dev/null; then
    git commit -m "$message"
    echo "[GIT] Committed (eval-$platform): $message" >&2
  else
    echo "[GIT] No changes to commit (eval-$platform)" >&2
  fi
}

checkpoint_tag() {
  local tag_name="$1"
  cd "$HARNESS_ROOT"
  git tag -f "$tag_name"
  echo "[GIT] Tagged: $tag_name" >&2
}

sprint_gen_tag() {
  local sprint="$1"
  local platform="$2"
  local attempt="$3"
  platform_commit "$platform" "Sprint $sprint: $platform generation (attempt $attempt)"
  checkpoint_tag "sprint-${sprint}-${platform}-gen-attempt-${attempt}"
}

sprint_complete_tag() {
  local sprint="$1"
  checkpoint_commit "Sprint $sprint complete"
  checkpoint_tag "sprint-${sprint}-complete"
}
