#!/bin/bash
# Cross-sprint issue tracking
# Carries forward unresolved issues so they get re-tested in subsequent sprints

source "$(dirname "${BASH_SOURCE[0]}")/../../config.sh"

UNRESOLVED_FILE="$HARNESS_ROOT/artifacts/unresolved-issues.json"

init_issues() {
  echo "[]" > "$UNRESOLVED_FILE"
}

# After evaluation, extract any issues that were found and add to unresolved list
# Also checks if previously unresolved issues are now fixed (by checking if
# they're no longer reported)
update_issues_after_eval() {
  local platform="$1"
  local sprint="$2"
  local eval_file="$HARNESS_ROOT/artifacts/evaluations/${platform}-eval-${sprint}.json"

  if [ ! -f "$eval_file" ]; then
    return
  fi

  # Get current issues from this evaluation
  local new_issues
  new_issues=$(jq -c "[.issues[] | {
    source_sprint: $sprint,
    platform: \"$platform\",
    severity: .severity,
    category: .category,
    description: .description,
    fix_suggestion: .fix_suggestion,
    screenshot: .screenshot
  }]" "$eval_file" 2>/dev/null || echo "[]")

  # Get existing unresolved issues
  local existing
  existing=$(cat "$UNRESOLVED_FILE" 2>/dev/null || echo "[]")

  # Merge: keep new issues, carry forward high/medium from previous sprints
  # that weren't in the generator's "addressed" list
  local handoff_file="$HARNESS_ROOT/artifacts/handoffs/${platform}-handoff-${sprint}.json"
  local addressed="[]"
  if [ -f "$handoff_file" ]; then
    addressed=$(jq -c '[.previous_eval_issues_addressed // [] | .[].issue // empty]' "$handoff_file" 2>/dev/null || echo "[]")
  fi

  # Filter: remove issues from previous sprints if they were addressed
  python3 -c "
import json, sys

existing = json.loads('''$existing''')
new_issues = json.loads('''$new_issues''')
addressed = json.loads('''$addressed''')
addressed_lower = [a.lower() for a in addressed]

# Keep previous issues that weren't addressed and are high/medium
carried = []
for issue in existing:
    if issue.get('source_sprint', 0) < $sprint:
        desc_lower = issue.get('description', '').lower()
        was_addressed = any(a in desc_lower or desc_lower in a for a in addressed_lower)
        if not was_addressed and issue.get('severity') in ('high', 'medium'):
            issue['carried_from'] = issue.get('source_sprint', 0)
            carried.append(issue)

# Combine: carried forward + new from this sprint
all_issues = carried + new_issues
print(json.dumps(all_issues, indent=2))
" > "$UNRESOLVED_FILE"

  local count
  count=$(jq 'length' "$UNRESOLVED_FILE")
  local carried
  carried=$(jq '[.[] | select(.carried_from != null)] | length' "$UNRESOLVED_FILE")
  echo "[ISSUES] Sprint $sprint: $count total unresolved ($carried carried forward)" >&2
}

# Get unresolved issues from previous sprints to inject into evaluator prompt
get_carried_issues() {
  local platform="$1"
  local sprint="$2"

  if [ ! -f "$UNRESOLVED_FILE" ]; then
    return
  fi

  local carried
  carried=$(jq -c "[.[] | select(.source_sprint < $sprint and .platform == \"$platform\")]" "$UNRESOLVED_FILE" 2>/dev/null || echo "[]")
  local count
  count=$(echo "$carried" | jq 'length')

  if [ "$count" -gt 0 ]; then
    echo "

CARRIED FORWARD ISSUES FROM PREVIOUS SPRINTS — YOU MUST RE-TEST THESE:
$(echo "$carried" | jq -r '.[] | "- [Sprint \(.source_sprint)] [\(.severity)] \(.description)"')"
  fi
}
