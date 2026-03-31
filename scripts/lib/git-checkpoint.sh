#!/bin/bash
# Git checkpoint helpers for sprint boundaries

source "$(dirname "${BASH_SOURCE[0]}")/../../config.sh"

checkpoint_commit() {
  local message="$1"
  cd "$HARNESS_ROOT"
  git add -A
  # Only commit if there are changes
  if ! git diff --cached --quiet 2>/dev/null; then
    git commit -m "$message"
    echo "[GIT] Committed: $message" >&2
  else
    echo "[GIT] No changes to commit" >&2
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
  checkpoint_commit "Sprint $sprint: $platform generation (attempt $attempt)"
  checkpoint_tag "sprint-${sprint}-${platform}-gen-attempt-${attempt}"
}

sprint_complete_tag() {
  local sprint="$1"
  checkpoint_commit "Sprint $sprint complete"
  checkpoint_tag "sprint-${sprint}-complete"
}
