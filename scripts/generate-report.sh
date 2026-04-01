#!/bin/bash
# Generate an interactive HTML report from harness artifacts
set -euo pipefail

HARNESS_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT="$HARNESS_ROOT/report.html"

# Collect all data into JS variables
SPEC_CONTENT=$(cat "$HARNESS_ROOT/artifacts/specs/current-spec.md" 2>/dev/null | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")
META=$(cat "$HARNESS_ROOT/artifacts/specs/current-meta.json" 2>/dev/null || echo '{}')

# Pre-render spec markdown to HTML
SPEC_HTML=$(cat "$HARNESS_ROOT/artifacts/specs/current-spec.md" 2>/dev/null | python3 -c "
import sys, json
try:
    import markdown
    raw = sys.stdin.read()
    html = markdown.markdown(raw, extensions=['tables', 'fenced_code'])
    print(json.dumps(html))
except ImportError:
    raw = sys.stdin.read()
    import html as h
    escaped = h.escape(raw)
    print(json.dumps('<pre style=\"white-space:pre-wrap;font-size:13px;line-height:1.7\">' + escaped + '</pre>'))
" 2>/dev/null || echo '""')

# Web evals
EVALS="["
first=true
for f in "$HARNESS_ROOT"/artifacts/evaluations/web-eval-*.json; do
  [ -f "$f" ] || continue
  $first || EVALS+=","
  EVALS+="$(cat "$f")"
  first=false
done
EVALS+="]"

# iOS evals
IOS_EVALS="["
first=true
for f in "$HARNESS_ROOT"/artifacts/evaluations/ios-eval-*.json; do
  [ -f "$f" ] || continue
  $first || IOS_EVALS+=","
  IOS_EVALS+="$(cat "$f")"
  first=false
done
IOS_EVALS+="]"

# Web handoffs
HANDOFFS="["
first=true
for f in "$HARNESS_ROOT"/artifacts/handoffs/web-handoff-*.json; do
  [ -f "$f" ] || continue
  $first || HANDOFFS+=","
  HANDOFFS+="$(cat "$f")"
  first=false
done
HANDOFFS+="]"

# iOS handoffs
IOS_HANDOFFS="["
first=true
for f in "$HARNESS_ROOT"/artifacts/handoffs/ios-handoff-*.json; do
  [ -f "$f" ] || continue
  $first || IOS_HANDOFFS+=","
  IOS_HANDOFFS+="$(cat "$f")"
  first=false
done
IOS_HANDOFFS+="]"

# Collect screenshots as base64
SCREENSHOTS="{"
first=true
for f in "$HARNESS_ROOT"/artifacts/screenshots/*.png; do
  [ -f "$f" ] || continue
  name=$(basename "$f")
  $first || SCREENSHOTS+=","
  b64=$(base64 -i "$f")
  SCREENSHOTS+="\"$name\":\"data:image/png;base64,$b64\""
  first=false
done
SCREENSHOTS+="}"

# Git log
GIT_LOG=$(cd "$HARNESS_ROOT" && git log --oneline --reverse 2>/dev/null | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")

cat > "$OUTPUT" << 'HTMLEOF'
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Harness10 — Run Report</title>
<style>
  :root {
    --bg: #09090b; --bg2: #18181b; --bg3: #27272a;
    --fg: #fafafa; --fg2: #a1a1aa; --fg3: #71717a;
    --accent: #3b82f6; --green: #22c55e; --red: #ef4444;
    --yellow: #eab308; --orange: #f97316;
    --border: #27272a; --radius: 8px;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace; background: var(--bg); color: var(--fg); line-height: 1.6; }

  .container { max-width: 1400px; margin: 0 auto; padding: 24px; }

  /* Header */
  .header { text-align: center; padding: 48px 0 32px; border-bottom: 1px solid var(--border); margin-bottom: 32px; }
  .header h1 { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
  .header p { color: var(--fg2); margin-top: 8px; font-size: 14px; }

  /* Architecture diagram */
  .architecture { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 32px; margin-bottom: 32px; }
  .architecture h2 { font-size: 16px; color: var(--fg2); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .architecture .hint { font-size: 12px; color: var(--fg3); margin-bottom: 24px; }

  .pipeline { display: flex; align-items: center; justify-content: center; gap: 0; flex-wrap: wrap; }
  .agent-node { background: var(--bg3); border: 2px solid var(--border); border-radius: var(--radius); padding: 16px 20px; text-align: center; min-width: 140px; transition: all 0.2s; cursor: pointer; position: relative; }
  .agent-node:hover { border-color: var(--accent); transform: translateY(-2px); }
  .agent-node.active { border-color: var(--accent); box-shadow: 0 0 20px rgba(59,130,246,0.2); }
  .agent-node .role { font-size: 11px; color: var(--fg3); text-transform: uppercase; letter-spacing: 1px; }
  .agent-node .name { font-size: 16px; font-weight: 600; margin-top: 4px; }
  .agent-node .tools { font-size: 11px; color: var(--fg3); margin-top: 6px; }
  .agent-node .status { position: absolute; top: -6px; right: -6px; width: 14px; height: 14px; border-radius: 50%; }
  .arrow { color: var(--fg3); font-size: 24px; padding: 0 8px; flex-shrink: 0; }
  .parallel-group { display: flex; flex-direction: column; gap: 8px; align-items: center; }
  .parallel-label { font-size: 10px; color: var(--fg3); text-transform: uppercase; letter-spacing: 1px; }

  /* Sprint tabs */
  .sprint-tabs { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
  .sprint-tab { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 20px; cursor: pointer; font-family: inherit; color: var(--fg2); font-size: 13px; transition: all 0.15s; }
  .sprint-tab:hover { border-color: var(--fg3); color: var(--fg); }
  .sprint-tab.active { background: var(--accent); border-color: var(--accent); color: white; }

  /* Score cards */
  .scores-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px; }
  .score-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; text-align: center; }
  .score-card .label { font-size: 11px; color: var(--fg3); text-transform: uppercase; letter-spacing: 1px; }
  .score-card .value { font-size: 32px; font-weight: 700; margin-top: 4px; }
  .score-card .bar { height: 4px; background: var(--bg3); border-radius: 2px; margin-top: 8px; overflow: hidden; }
  .score-card .bar-fill { height: 100%; border-radius: 2px; transition: width 0.5s ease; }

  /* Done conditions */
  .section { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; margin-bottom: 24px; }
  .section h3 { font-size: 14px; color: var(--fg2); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; }
  .dc-item { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); }
  .dc-item:last-child { border-bottom: none; }
  .dc-badge { flex-shrink: 0; font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 600; margin-top: 2px; }
  .dc-badge.pass { background: rgba(34,197,94,0.15); color: var(--green); }
  .dc-badge.fail { background: rgba(239,68,68,0.15); color: var(--red); }
  .dc-id { font-size: 12px; color: var(--fg3); font-weight: 600; flex-shrink: 0; width: 56px; margin-top: 2px; }
  .dc-content { flex: 1; }
  .dc-content .desc { font-size: 13px; }
  .dc-content .notes { font-size: 12px; color: var(--fg3); margin-top: 4px; }

  /* Issues */
  .issue { padding: 12px; margin-bottom: 8px; border-radius: var(--radius); border-left: 3px solid; }
  .issue.high { background: rgba(239,68,68,0.08); border-color: var(--red); }
  .issue.medium { background: rgba(234,179,8,0.08); border-color: var(--yellow); }
  .issue.low { background: rgba(59,130,246,0.08); border-color: var(--accent); }
  .issue .issue-header { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; }
  .issue .severity { font-size: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; }
  .issue .category { font-size: 10px; color: var(--fg3); text-transform: uppercase; letter-spacing: 1px; }
  .issue .issue-desc { font-size: 13px; }
  .issue .fix { font-size: 12px; color: var(--fg3); margin-top: 6px; font-style: italic; }

  /* Screenshots */
  .screenshots-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
  .screenshot-card { background: var(--bg3); border-radius: var(--radius); overflow: hidden; cursor: pointer; transition: transform 0.15s; }
  .screenshot-card:hover { transform: scale(1.02); }
  .screenshot-card img { width: 100%; height: 180px; object-fit: cover; object-position: top; }
  .screenshot-card .caption { padding: 8px 12px; font-size: 11px; color: var(--fg3); }

  /* Lightbox */
  .lightbox { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 200; align-items: center; justify-content: center; cursor: pointer; }
  .lightbox.open { display: flex; }
  .lightbox img { max-width: 90vw; max-height: 90vh; border-radius: var(--radius); }

  /* Handoff */
  .features-list { list-style: none; }
  .features-list li { padding: 6px 0; font-size: 13px; border-bottom: 1px solid var(--border); display: flex; gap: 8px; }
  .features-list li:last-child { border-bottom: none; }
  .story-id { color: var(--accent); font-weight: 600; font-size: 12px; flex-shrink: 0; width: 56px; }

  /* Git log */
  .git-log { font-size: 12px; color: var(--fg2); white-space: pre-wrap; line-height: 2; }
  .git-log .hash { color: var(--yellow); }

  /* Score trend */
  .trend-chart { display: flex; align-items: end; gap: 4px; height: 100px; padding: 16px 0; }
  .trend-bar-group { flex: 1; display: flex; gap: 2px; align-items: end; height: 100%; }
  .trend-bar { flex: 1; border-radius: 3px 3px 0 0; min-width: 16px; transition: height 0.5s ease; position: relative; }
  .trend-bar:hover::after { content: attr(data-tooltip); position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: var(--bg); border: 1px solid var(--border); padding: 4px 8px; border-radius: 4px; font-size: 10px; white-space: nowrap; color: var(--fg); }
  .trend-labels { display: flex; justify-content: space-around; font-size: 11px; color: var(--fg3); margin-top: 4px; }
  .trend-legend { display: flex; gap: 16px; justify-content: center; margin-top: 12px; font-size: 11px; color: var(--fg3); }
  .trend-legend span::before { content: ''; display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 4px; vertical-align: middle; }
  .trend-legend .l-func::before { background: var(--green); }
  .trend-legend .l-design::before { background: var(--accent); }
  .trend-legend .l-craft::before { background: var(--yellow); }
  .trend-legend .l-orig::before { background: var(--orange); }

  /* Flow timeline */
  .timeline { position: relative; padding-left: 32px; }
  .timeline::before { content: ''; position: absolute; left: 11px; top: 0; bottom: 0; width: 2px; background: var(--border); }
  .timeline-item { position: relative; padding-bottom: 24px; }
  .timeline-item::before { content: ''; position: absolute; left: -25px; top: 4px; width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--border); background: var(--bg); }
  .timeline-item.planner::before { background: var(--accent); border-color: var(--accent); }
  .timeline-item.generator::before { background: var(--green); border-color: var(--green); }
  .timeline-item.evaluator::before { background: var(--yellow); border-color: var(--yellow); }
  .timeline-item .tl-label { font-size: 11px; color: var(--fg3); text-transform: uppercase; letter-spacing: 1px; }
  .timeline-item .tl-title { font-size: 14px; font-weight: 600; margin-top: 2px; }
  .timeline-item .tl-desc { font-size: 12px; color: var(--fg2); margin-top: 4px; }

  /* ===== Drawer ===== */
  .drawer-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; }
  .drawer-backdrop.open { display: block; }
  .drawer { position: fixed; top: 0; right: 0; bottom: 0; width: 520px; background: var(--bg); border-left: 1px solid var(--border); z-index: 101; transform: translateX(100%); transition: transform 0.25s ease; overflow: hidden; display: flex; flex-direction: column; }
  .drawer.open { transform: translateX(0); }
  .drawer-header { padding: 20px 24px 16px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .drawer-header-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .drawer-header .agent-badge { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; padding: 3px 10px; border-radius: 4px; font-weight: 600; display: inline-block; }
  .drawer-header .agent-badge.planner { background: rgba(59,130,246,0.15); color: var(--accent); }
  .drawer-header .agent-badge.generator { background: rgba(34,197,94,0.15); color: var(--green); }
  .drawer-header .agent-badge.evaluator { background: rgba(234,179,8,0.15); color: var(--yellow); }
  .drawer-header .agent-badge.verdict { background: rgba(249,115,22,0.15); color: var(--orange); }
  .drawer-header h2 { font-size: 20px; font-weight: 700; margin-top: 8px; }
  .drawer-header .subtitle { font-size: 12px; color: var(--fg3); margin-top: 4px; }
  .drawer-close { background: none; border: 1px solid var(--border); border-radius: var(--radius); color: var(--fg2); width: 32px; height: 32px; cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; flex-shrink: 0; }
  .drawer-close:hover { background: var(--bg3); color: var(--fg); border-color: var(--fg3); }
  .drawer-sprint-tabs { display: flex; gap: 6px; padding: 12px 24px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .drawer-sprint-pill { background: var(--bg3); border: 1px solid var(--border); border-radius: 20px; padding: 5px 14px; cursor: pointer; font-family: inherit; color: var(--fg3); font-size: 12px; transition: all 0.15s; }
  .drawer-sprint-pill:hover { border-color: var(--fg3); color: var(--fg2); }
  .drawer-sprint-pill.active { background: var(--accent); border-color: var(--accent); color: white; }
  .drawer-body { flex: 1; overflow-y: auto; padding: 24px; }

  /* Drawer content blocks */
  .drawer-section { margin-bottom: 24px; }
  .drawer-section h4 { font-size: 11px; color: var(--fg3); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid var(--border); }
  .drawer-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .drawer-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px; text-align: center; }
  .drawer-card .card-value { font-size: 22px; font-weight: 700; }
  .drawer-card .card-label { font-size: 10px; color: var(--fg3); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
  .drawer-tag { display: inline-block; font-size: 11px; padding: 3px 10px; border-radius: 4px; background: var(--bg3); border: 1px solid var(--border); color: var(--fg2); margin: 2px 4px 2px 0; }
  .drawer-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
  .drawer-row:last-child { border-bottom: none; }
  .drawer-row .row-label { color: var(--fg3); }
  .drawer-row .row-value { font-weight: 600; }
  .drawer-quote { background: var(--bg2); border-left: 3px solid var(--fg3); padding: 12px 16px; font-size: 12px; color: var(--fg2); line-height: 1.7; border-radius: 0 var(--radius) var(--radius) 0; }
  .drawer-link-btn { display: inline-flex; align-items: center; gap: 6px; background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius); padding: 8px 16px; font-family: inherit; font-size: 12px; color: var(--accent); cursor: pointer; transition: all 0.15s; margin-top: 8px; }
  .drawer-link-btn:hover { background: var(--bg2); border-color: var(--accent); }
  .sprint-table { width: 100%; font-size: 13px; border-collapse: collapse; }
  .sprint-table th { text-align: left; font-size: 11px; color: var(--fg3); text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 12px; border-bottom: 1px solid var(--border); }
  .sprint-table td { padding: 10px 12px; border-bottom: 1px solid var(--border); vertical-align: top; }
  .sprint-table tr { cursor: pointer; transition: background 0.1s; }
  .sprint-table tr:hover { background: var(--bg3); }
  .sprint-table .dc-count { color: var(--fg3); font-size: 12px; }
  .collapsible-toggle { background: none; border: 1px solid var(--border); border-radius: var(--radius); padding: 8px 16px; font-family: inherit; font-size: 12px; color: var(--fg2); cursor: pointer; width: 100%; text-align: left; transition: all 0.15s; display: flex; justify-content: space-between; align-items: center; }
  .collapsible-toggle:hover { background: var(--bg3); color: var(--fg); }
  .collapsible-content { display: none; margin-top: 12px; }
  .collapsible-content.open { display: block; }
  .spec-html { font-size: 13px; line-height: 1.8; color: var(--fg2); }
  .spec-html h1, .spec-html h2, .spec-html h3 { color: var(--fg); margin: 16px 0 8px; }
  .spec-html h1 { font-size: 20px; } .spec-html h2 { font-size: 16px; } .spec-html h3 { font-size: 14px; }
  .spec-html code { background: var(--bg3); padding: 2px 6px; border-radius: 3px; font-size: 12px; }
  .spec-html pre { background: var(--bg3); padding: 12px; border-radius: var(--radius); overflow-x: auto; margin: 8px 0; }
  .spec-html pre code { background: none; padding: 0; }
  .spec-html ul, .spec-html ol { margin-left: 20px; margin-bottom: 8px; }
  .spec-html table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  .spec-html th, .spec-html td { border: 1px solid var(--border); padding: 6px 10px; font-size: 12px; }
  .spec-html th { background: var(--bg3); }
  .drawer-skipped { text-align: center; padding: 60px 24px; color: var(--fg3); }
  .drawer-skipped .skip-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.3; }
  .drawer-skipped p { font-size: 14px; }
  .verdict-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 8px; }
  .verdict-row .sprint-num { font-weight: 700; font-size: 14px; width: 70px; }
  .verdict-row .scores-mini { flex: 1; display: flex; gap: 16px; font-size: 12px; color: var(--fg2); }
  .verdict-row .scores-mini span { display: flex; align-items: center; gap: 4px; }
  .verdict-row .verdict-badge { font-size: 11px; font-weight: 700; padding: 3px 12px; border-radius: 4px; }
  .verdict-badge.pass { background: rgba(34,197,94,0.15); color: var(--green); }
  .verdict-badge.fail { background: rgba(239,68,68,0.15); color: var(--red); }
  .threshold-box { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 16px; font-size: 12px; color: var(--fg2); margin-bottom: 16px; }
  .threshold-box code { background: var(--bg3); padding: 2px 6px; border-radius: 3px; font-size: 11px; color: var(--fg); }
  .env-badge { display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
  .env-badge.ok { background: rgba(34,197,94,0.15); color: var(--green); }
  .env-badge.err { background: rgba(239,68,68,0.15); color: var(--red); }

  /* Drawer screenshot thumbnails */
  .drawer-screenshots { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .drawer-thumb { background: var(--bg3); border-radius: var(--radius); overflow: hidden; cursor: pointer; transition: transform 0.15s; }
  .drawer-thumb:hover { transform: scale(1.03); }
  .drawer-thumb img { width: 100%; height: 120px; object-fit: cover; object-position: top; }
  .drawer-thumb .caption { padding: 6px 8px; font-size: 10px; color: var(--fg3); }

  @media (max-width: 768px) {
    .pipeline { flex-direction: column; }
    .arrow { transform: rotate(90deg); }
    .scores-grid { grid-template-columns: repeat(2, 1fr); }
    .screenshots-grid { grid-template-columns: 1fr; }
    .drawer { width: 100%; }
    .drawer-cards { grid-template-columns: repeat(2, 1fr); }
  }
</style>
</head>
<body>

<div class="container">
  <div class="header">
    <h1>Harness10 Run Report</h1>
    <p>Multi-agent harness: Planner → Generator → Evaluator</p>
  </div>

  <!-- Architecture -->
  <div class="architecture">
    <h2>Agent Pipeline</h2>
    <div class="hint">Click any agent to view details</div>
    <div class="pipeline">
      <div class="agent-node" id="node-planner" onclick="openDrawer('planner')">
        <div class="status" style="background:var(--green)"></div>
        <div class="role">Agent 1</div>
        <div class="name">Planner</div>
        <div class="tools">Read-only</div>
      </div>
      <div class="arrow">→</div>
      <div class="parallel-group">
        <div class="parallel-label">parallel</div>
        <div class="agent-node" id="node-gen-web" onclick="openDrawer('gen-web')">
          <div class="status" style="background:var(--green)"></div>
          <div class="role">Agent 2a</div>
          <div class="name">Gen-Web</div>
          <div class="tools">Read/Write/Edit/Bash</div>
        </div>
        <div class="agent-node" id="node-gen-ios" onclick="openDrawer('gen-ios')">
          <div class="role">Agent 2b</div>
          <div class="name">Gen-iOS</div>
          <div class="tools">Read/Write/Edit/Bash</div>
        </div>
      </div>
      <div class="arrow">→</div>
      <div class="parallel-group">
        <div class="parallel-label">parallel</div>
        <div class="agent-node" id="node-eval-web" onclick="openDrawer('eval-web')">
          <div class="status" style="background:var(--green)"></div>
          <div class="role">Agent 3a</div>
          <div class="name">Eval-Web</div>
          <div class="tools">Claude Preview MCP</div>
        </div>
        <div class="agent-node" id="node-eval-ios" onclick="openDrawer('eval-ios')">
          <div class="role">Agent 3b</div>
          <div class="name">Eval-iOS</div>
          <div class="tools">Computer Use MCP</div>
        </div>
      </div>
      <div class="arrow">→</div>
      <div class="agent-node" id="node-verdict" onclick="openDrawer('verdict')">
        <div class="status" style="background:var(--green)"></div>
        <div class="role">Verdict</div>
        <div class="name">Pass/Fail</div>
        <div class="tools">Score threshold</div>
      </div>
    </div>
  </div>

  <!-- Score Trend -->
  <div class="section">
    <h3>Score Trend Across Sprints</h3>
    <div id="trend-chart"></div>
    <div class="trend-legend">
      <span class="l-func">Functionality</span>
      <span class="l-design">Design</span>
      <span class="l-craft">Craft</span>
      <span class="l-orig">Originality</span>
    </div>
  </div>

  <!-- Flow Timeline -->
  <div class="section">
    <h3>Execution Timeline</h3>
    <div id="timeline" class="timeline"></div>
  </div>

  <!-- Sprint tabs -->
  <div class="sprint-tabs" id="sprint-tabs"></div>

  <!-- Sprint detail -->
  <div id="sprint-detail"></div>

  <!-- Git log -->
  <div class="section">
    <h3>Git History</h3>
    <div class="git-log" id="git-log"></div>
  </div>
</div>

<!-- Lightbox -->
<div class="lightbox" id="lightbox" onclick="this.classList.remove('open')">
  <img id="lightbox-img" src="" alt="">
</div>

<!-- Drawer -->
<div class="drawer-backdrop" id="drawer-backdrop" onclick="closeDrawer()"></div>
<div class="drawer" id="drawer">
  <div class="drawer-header" id="drawer-header"></div>
  <div class="drawer-sprint-tabs" id="drawer-sprint-tabs" style="display:none"></div>
  <div class="drawer-body" id="drawer-body"></div>
</div>

<script>
HTMLEOF

# Inject data
cat >> "$OUTPUT" << DATAEOF
const META = $META;
const EVALS = $EVALS;
const IOS_EVALS = $IOS_EVALS;
const HANDOFFS = $HANDOFFS;
const IOS_HANDOFFS = $IOS_HANDOFFS;
const SCREENSHOTS = $SCREENSHOTS;
const GIT_LOG = $GIT_LOG;
const SPEC = $SPEC_CONTENT;
const SPEC_HTML = $SPEC_HTML;
DATAEOF

cat >> "$OUTPUT" << 'JSEOF'

// ===== Drawer state =====
let currentDrawer = null; // { type, platform, sprintIdx }

function openDrawer(agentId) {
  // Clear all active states
  document.querySelectorAll('.agent-node').forEach(n => n.classList.remove('active'));

  // Determine agent type and set active
  const nodeEl = document.getElementById('node-' + agentId);
  if (nodeEl) nodeEl.classList.add('active');

  let type, platform, sprintIdx;
  if (agentId === 'planner') {
    type = 'planner'; platform = null; sprintIdx = 0;
  } else if (agentId === 'gen-web') {
    type = 'generator'; platform = 'web'; sprintIdx = 0;
  } else if (agentId === 'gen-ios') {
    type = 'generator'; platform = 'ios'; sprintIdx = 0;
  } else if (agentId === 'eval-web') {
    type = 'evaluator'; platform = 'web'; sprintIdx = 0;
  } else if (agentId === 'eval-ios') {
    type = 'evaluator'; platform = 'ios'; sprintIdx = 0;
  } else if (agentId === 'verdict') {
    type = 'verdict'; platform = null; sprintIdx = 0;
  }

  currentDrawer = { type, platform, sprintIdx };
  renderDrawer();

  document.getElementById('drawer-backdrop').classList.add('open');
  document.getElementById('drawer').classList.add('open');
}

function closeDrawer() {
  document.getElementById('drawer-backdrop').classList.remove('open');
  document.getElementById('drawer').classList.remove('open');
  document.querySelectorAll('.agent-node').forEach(n => n.classList.remove('active'));
  currentDrawer = null;
}

function switchDrawerSprint(idx) {
  if (!currentDrawer) return;
  currentDrawer.sprintIdx = idx;
  renderDrawer();
}

function switchToAgent(agentId, sprintIdx) {
  closeDrawer();
  // Small delay for visual feedback
  setTimeout(() => {
    openDrawer(agentId);
    if (typeof sprintIdx === 'number' && currentDrawer) {
      currentDrawer.sprintIdx = sprintIdx;
      renderDrawer();
    }
  }, 100);
}

// ESC to close
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && currentDrawer) closeDrawer();
});

function getEvalsFor(platform) { return platform === 'ios' ? IOS_EVALS : EVALS; }
function getHandoffsFor(platform) { return platform === 'ios' ? IOS_HANDOFFS : HANDOFFS; }

function renderDrawer() {
  if (!currentDrawer) return;
  const { type, platform, sprintIdx } = currentDrawer;

  const headerEl = document.getElementById('drawer-header');
  const tabsEl = document.getElementById('drawer-sprint-tabs');
  const bodyEl = document.getElementById('drawer-body');

  if (type === 'planner') {
    headerEl.innerHTML = renderDrawerHeader('planner', 'Planner', 'Product Architect', 'Expands brief idea into comprehensive spec, sprint contracts, and done conditions');
    tabsEl.style.display = 'none';
    bodyEl.innerHTML = renderPlannerBody();
  } else if (type === 'generator') {
    const evals = getEvalsFor(platform);
    const handoffs = getHandoffsFor(platform);
    const label = platform === 'ios' ? 'Gen-iOS' : 'Gen-Web';
    const sub = platform === 'ios' ? 'SwiftUI Generator' : 'Next.js 16 Generator';

    if (handoffs.length === 0) {
      headerEl.innerHTML = renderDrawerHeader('generator', label, sub, '');
      tabsEl.style.display = 'none';
      bodyEl.innerHTML = renderSkipped(platform);
    } else {
      headerEl.innerHTML = renderDrawerHeader('generator', label, sub, `${handoffs.length} sprint(s) completed`);
      tabsEl.style.display = 'flex';
      tabsEl.innerHTML = renderSprintPills(handoffs, sprintIdx);
      bodyEl.innerHTML = renderGeneratorBody(platform, sprintIdx);
    }
  } else if (type === 'evaluator') {
    const evals = getEvalsFor(platform);
    const label = platform === 'ios' ? 'Eval-iOS' : 'Eval-Web';
    const sub = platform === 'ios' ? 'Computer Use MCP' : 'Claude Preview MCP';

    if (evals.length === 0) {
      headerEl.innerHTML = renderDrawerHeader('evaluator', label, sub, '');
      tabsEl.style.display = 'none';
      bodyEl.innerHTML = renderSkipped(platform);
    } else {
      headerEl.innerHTML = renderDrawerHeader('evaluator', label, sub, `${evals.length} sprint(s) evaluated`);
      tabsEl.style.display = 'flex';
      tabsEl.innerHTML = renderSprintPills(evals, sprintIdx);
      bodyEl.innerHTML = renderEvaluatorBody(platform, sprintIdx);
    }
  } else if (type === 'verdict') {
    headerEl.innerHTML = renderDrawerHeader('verdict', 'Verdict', 'Pass/Fail Gate', 'Determines if each sprint meets quality thresholds');
    tabsEl.style.display = 'none';
    bodyEl.innerHTML = renderVerdictBody();
  }

  // Scroll body to top
  bodyEl.scrollTop = 0;
}

function renderDrawerHeader(badgeClass, title, subtitle, desc) {
  return `<div class="drawer-header-top"><div><span class="agent-badge ${badgeClass}">${badgeClass}</span><h2>${title}</h2><div class="subtitle">${subtitle}</div>${desc ? `<div class="subtitle" style="margin-top:2px">${desc}</div>` : ''}</div><button class="drawer-close" onclick="closeDrawer()">×</button></div>`;
}

function renderSprintPills(arr, activeIdx) {
  return arr.map((item, i) => {
    const num = item.sprint || (i + 1);
    const active = i === activeIdx ? 'active' : '';
    const indicator = item.pass !== undefined ? (item.pass ? ' ✓' : ' ✗') : '';
    return `<button class="drawer-sprint-pill ${active}" onclick="switchDrawerSprint(${i})">S${num}${indicator}</button>`;
  }).join('');
}

function renderSkipped(platform) {
  return `<div class="drawer-skipped"><div class="skip-icon">⏭</div><p>This platform was skipped</p><p style="font-size:12px;margin-top:8px;color:var(--fg3)">${platform === 'ios' ? 'iOS' : 'Web'} was not built in this run. Use <code>--${platform === 'ios' ? 'ios' : 'web'}-only</code> or omit the flag to build both platforms.</p></div>`;
}

// ===== Planner Body =====
function renderPlannerBody() {
  let html = '';

  // Summary cards
  html += '<div class="drawer-section"><h4>Overview</h4><div class="drawer-cards">';
  html += `<div class="drawer-card"><div class="card-value" style="color:var(--accent)">${META.complexity || '?'}</div><div class="card-label">Complexity</div></div>`;
  html += `<div class="drawer-card"><div class="card-value">${META.sprints?.length || 0}</div><div class="card-label">Sprints</div></div>`;
  html += `<div class="drawer-card"><div class="card-value">${META.userStoryCount || 0}</div><div class="card-label">Stories</div></div>`;
  const webScreens = META.screenCount?.web || 0;
  const iosScreens = META.screenCount?.ios || 0;
  html += `<div class="drawer-card"><div class="card-value">${webScreens}/${iosScreens}</div><div class="card-label">Screens W/I</div></div>`;
  html += `<div class="drawer-card"><div class="card-value">${META.dataModels?.length || 0}</div><div class="card-label">Models</div></div>`;
  html += `<div class="drawer-card"><div class="card-value" style="color:${META.authRequired ? 'var(--green)' : 'var(--fg3)'}">${META.authRequired ? 'Yes' : 'No'}</div><div class="card-label">Auth</div></div>`;
  html += '</div></div>';

  // Tags
  html += '<div class="drawer-section"><h4>Details</h4>';
  html += '<div style="margin-bottom:12px">';
  html += `<span style="font-size:12px;color:var(--fg3);margin-right:8px">Platforms:</span>`;
  (META.platforms || []).forEach(p => { html += `<span class="drawer-tag">${p}</span>`; });
  html += '</div>';
  html += '<div style="margin-bottom:12px">';
  html += `<span style="font-size:12px;color:var(--fg3);margin-right:8px">Data Models:</span>`;
  (META.dataModels || []).forEach(m => { html += `<span class="drawer-tag">${m}</span>`; });
  html += '</div>';
  html += `<div><span style="font-size:12px;color:var(--fg3);margin-right:8px">Shared Backend:</span><span class="drawer-tag">${META.shared_backend ? 'Yes' : 'No'}</span></div>`;
  html += '</div>';

  // Sprint plan table
  if (META.sprints?.length) {
    html += '<div class="drawer-section"><h4>Sprint Plan</h4>';
    html += '<table class="sprint-table"><thead><tr><th>#</th><th>Title</th><th>DCs</th></tr></thead><tbody>';
    META.sprints.forEach((s, i) => {
      const dcCount = s.done_conditions?.length || 0;
      html += `<tr onclick="switchToAgent('gen-web', ${i})"><td style="font-weight:700;color:var(--accent)">S${s.number}</td><td><div style="font-weight:600">${s.title}</div><div style="font-size:11px;color:var(--fg3);margin-top:2px">${s.scope}</div></td><td class="dc-count">${dcCount}</td></tr>`;
    });
    html += '</tbody></table></div>';
  }

  // Full spec (collapsible)
  html += '<div class="drawer-section">';
  html += `<button class="collapsible-toggle" onclick="this.nextElementSibling.classList.toggle('open'); this.querySelector('.arrow').textContent = this.nextElementSibling.classList.contains('open') ? '▾' : '▸'">Full Product Spec <span class="arrow">▸</span></button>`;
  html += `<div class="collapsible-content"><div class="spec-html">${SPEC_HTML}</div></div>`;
  html += '</div>';

  return html;
}

// ===== Generator Body =====
function renderGeneratorBody(platform, sprintIdx) {
  const handoffs = getHandoffsFor(platform);
  const ho = handoffs[sprintIdx];
  if (!ho) return '<p style="color:var(--fg3)">No handoff data for this sprint.</p>';

  let html = '';

  // Summary
  html += '<div class="drawer-section"><h4>Summary</h4>';
  html += '<div class="drawer-row"><span class="row-label">Git Ref</span><span class="row-value" style="color:var(--yellow);font-family:monospace">' + (ho.git_ref || 'n/a') + '</span></div>';
  html += '<div class="drawer-row"><span class="row-label">Attempt</span><span class="row-value">' + (ho.attempt || 1) + '</span></div>';
  html += '<div class="drawer-row"><span class="row-label">Timestamp</span><span class="row-value">' + (ho.timestamp || 'n/a') + '</span></div>';
  if (ho.how_to_run) {
    const runCmd = typeof ho.how_to_run === 'string' ? ho.how_to_run : (ho.how_to_run.web || ho.how_to_run.ios || JSON.stringify(ho.how_to_run));
    html += '<div class="drawer-row"><span class="row-label">Run</span><span class="row-value" style="font-size:11px">' + runCmd + '</span></div>';
  }
  html += '</div>';

  // Completed features
  if (ho.completed_features?.length) {
    html += '<div class="drawer-section"><h4>Completed Features (' + ho.completed_features.length + ')</h4>';
    html += '<ul class="features-list">';
    ho.completed_features.forEach(f => {
      const statusColor = f.status === 'complete' ? 'var(--green)' : f.status === 'partial' ? 'var(--yellow)' : 'var(--fg3)';
      html += `<li><span class="story-id">${f.story_id}</span><span>${f.description}${f.notes ? ` <span style="color:var(--fg3);font-size:11px">— ${f.notes}</span>` : ''}</span></li>`;
    });
    html += '</ul></div>';
  }

  // Done conditions (self-reported)
  if (ho.done_conditions?.length) {
    html += '<div class="drawer-section"><h4>Done Conditions (Self-Reported)</h4>';
    ho.done_conditions.forEach(dc => {
      const pass = dc.status === 'complete';
      html += `<div class="dc-item"><div class="dc-id">${dc.id}</div><div class="dc-badge ${pass ? 'pass' : 'fail'}">${dc.status || '?'}</div><div class="dc-content"><div class="desc">${dc.description}</div>${dc.notes ? `<div class="notes">${dc.notes}</div>` : ''}</div></div>`;
    });
    html += '</div>';
  }

  // Routes / screens
  if (ho.routes_or_screens?.length) {
    html += '<div class="drawer-section"><h4>Routes / Screens (' + ho.routes_or_screens.length + ')</h4>';
    ho.routes_or_screens.forEach(r => {
      html += `<div class="drawer-row"><span class="row-value" style="color:var(--accent);font-size:12px">${r.path_or_view}</span><span class="row-label" style="font-size:11px;text-align:right;flex:1;margin-left:12px">${r.description}</span></div>`;
    });
    html += '</div>';
  }

  // Environment
  if (ho.environment) {
    html += '<div class="drawer-section"><h4>Environment</h4>';
    const env = ho.environment;
    html += `<div class="drawer-row"><span class="row-label">Build</span><span class="env-badge ${env.build_succeeds ? 'ok' : 'err'}">${env.build_succeeds ? 'Passes' : 'Fails'}</span></div>`;
    html += `<div class="drawer-row"><span class="row-label">Dependencies</span><span class="env-badge ${env.dependencies_installed ? 'ok' : 'err'}">${env.dependencies_installed ? 'Installed' : 'Missing'}</span></div>`;
    if (env.node_version_required) html += `<div class="drawer-row"><span class="row-label">Node.js</span><span class="row-value">${env.node_version_required}</span></div>`;
    if (env.env_vars_needed?.length) {
      html += `<div class="drawer-row"><span class="row-label">Env Vars</span><span class="row-value">${env.env_vars_needed.join(', ')}</span></div>`;
    }
    html += '</div>';
  }

  // Known issues
  if (ho.known_issues?.length) {
    html += '<div class="drawer-section"><h4>Known Issues</h4>';
    ho.known_issues.forEach(issue => {
      html += `<div style="font-size:12px;color:var(--fg2);padding:6px 0;border-bottom:1px solid var(--border)">• ${issue}</div>`;
    });
    html += '</div>';
  }

  // Self-eval notes
  if (ho.self_eval_notes) {
    html += '<div class="drawer-section"><h4>Self-Evaluation Notes</h4>';
    html += `<div class="drawer-quote">${ho.self_eval_notes}</div>`;
    html += '</div>';
  }

  // Previous eval issues addressed
  if (ho.previous_eval_issues_addressed?.length) {
    html += '<div class="drawer-section"><h4>Previous Eval Issues Addressed</h4>';
    ho.previous_eval_issues_addressed.forEach(issue => {
      html += `<div style="font-size:12px;color:var(--green);padding:6px 0;border-bottom:1px solid var(--border)">✓ ${typeof issue === 'string' ? issue : issue.description || JSON.stringify(issue)}</div>`;
    });
    html += '</div>';
  }

  // Cross-link to evaluator
  const evalPlatform = platform === 'ios' ? 'eval-ios' : 'eval-web';
  const evals = getEvalsFor(platform);
  if (evals.length > sprintIdx) {
    html += `<button class="drawer-link-btn" onclick="switchToAgent('${evalPlatform}', ${sprintIdx})">View Evaluator Results →</button>`;
  }

  return html;
}

// ===== Evaluator Body =====
function renderEvaluatorBody(platform, sprintIdx) {
  const evals = getEvalsFor(platform);
  const ev = evals[sprintIdx];
  if (!ev) return '<p style="color:var(--fg3)">No evaluation data for this sprint.</p>';

  let html = '';

  // Scores
  html += '<div class="drawer-section"><h4>Scores</h4>';
  html += '<div class="scores-grid" style="margin-bottom:0">';
  const scoreColors = { functionality: 'var(--green)', design_quality: 'var(--accent)', craft: 'var(--yellow)', originality: 'var(--orange)' };
  for (const [key, color] of Object.entries(scoreColors)) {
    const val = ev.scores[key] || 0;
    html += `<div class="score-card"><div class="label">${key.replace('_',' ')}</div><div class="value" style="color:${color}">${val}</div><div class="bar"><div class="bar-fill" style="width:${val*10}%;background:${color}"></div></div></div>`;
  }
  html += `<div class="score-card"><div class="label">Average</div><div class="value" style="color:${ev.pass ? 'var(--green)' : 'var(--red)'}">${ev.average.toFixed(1)}</div><div class="bar"><div class="bar-fill" style="width:${ev.average*10}%;background:${ev.pass ? 'var(--green)' : 'var(--red)'}"></div></div></div>`;
  html += '</div></div>';

  // Verdict callout
  const funcPass = (ev.scores.functionality || 0) >= 7;
  const avgPass = ev.average >= 7.0;
  html += '<div class="threshold-box">';
  html += `<span style="color:${funcPass ? 'var(--green)' : 'var(--red)'}">functionality ${ev.scores.functionality || 0} ${funcPass ? '≥' : '<'} 7</span>`;
  html += ` &nbsp;AND&nbsp; `;
  html += `<span style="color:${avgPass ? 'var(--green)' : 'var(--red)'}">average ${ev.average.toFixed(1)} ${avgPass ? '≥' : '<'} 7.0</span>`;
  html += ` → <span class="verdict-badge ${ev.pass ? 'pass' : 'fail'}" style="margin-left:8px">${ev.pass ? 'PASS' : 'FAIL'}</span>`;
  html += '</div>';

  // Done conditions
  if (ev.done_conditions_results?.length) {
    // Get generator self-reported for comparison
    const handoffs = getHandoffsFor(platform);
    const ho = handoffs[sprintIdx];
    const genDcMap = {};
    if (ho?.done_conditions) {
      ho.done_conditions.forEach(dc => { genDcMap[dc.id] = dc.status; });
    }

    const passed = ev.done_conditions_results.filter(d => d.pass).length;
    const total = ev.done_conditions_results.length;
    html += `<div class="drawer-section"><h4>Done Conditions (${passed}/${total} passed)</h4>`;
    ev.done_conditions_results.forEach(dc => {
      const genStatus = genDcMap[dc.id];
      let genBadge = '';
      if (genStatus) {
        const genPass = genStatus === 'complete';
        const mismatch = genPass !== dc.pass;
        genBadge = `<span class="drawer-tag" style="${mismatch ? 'border-color:var(--red);color:var(--red)' : ''}" title="Generator self-reported: ${genStatus}">Gen: ${genStatus}</span>`;
      }
      html += `<div class="dc-item"><div class="dc-id">${dc.id}</div><div class="dc-badge ${dc.pass ? 'pass' : 'fail'}">${dc.pass ? 'PASS' : 'FAIL'}</div><div class="dc-content"><div class="desc">${dc.description} ${genBadge}</div>${dc.notes ? `<div class="notes">${dc.notes}</div>` : ''}</div></div>`;
    });
    html += '</div>';
  }

  // Issues
  if (ev.issues?.length) {
    // Sort by severity: high, medium, low
    const sevOrder = { high: 0, medium: 1, low: 2 };
    const sorted = [...ev.issues].sort((a, b) => (sevOrder[a.severity] || 3) - (sevOrder[b.severity] || 3));

    html += `<div class="drawer-section"><h4>Issues (${sorted.length})</h4>`;
    sorted.forEach(issue => {
      const sevColor = issue.severity === 'high' ? 'var(--red)' : issue.severity === 'medium' ? 'var(--yellow)' : 'var(--accent)';
      html += `<div class="issue ${issue.severity}"><div class="issue-header"><span class="severity" style="color:${sevColor}">${issue.severity}</span><span class="category">${issue.category}</span></div><div class="issue-desc">${issue.description}</div>`;
      if (issue.fix_suggestion) html += `<div class="fix">Fix: ${issue.fix_suggestion}</div>`;
      // Screenshot thumbnail
      if (issue.screenshot) {
        const screenshotName = issue.screenshot.split('/').pop();
        if (SCREENSHOTS[screenshotName]) {
          html += `<div style="margin-top:8px"><img src="${SCREENSHOTS[screenshotName]}" alt="${screenshotName}" style="max-width:100%;max-height:120px;border-radius:4px;cursor:pointer;border:1px solid var(--border)" onclick="openLightbox('${screenshotName}')" loading="lazy"></div>`;
        }
      }
      html += '</div>';
    });
    html += '</div>';
  }

  // Console / network errors
  if (ev.console_errors?.length) {
    html += '<div class="drawer-section"><h4>Console Errors (' + ev.console_errors.length + ')</h4>';
    ev.console_errors.forEach(err => {
      html += `<div style="font-size:12px;color:var(--red);padding:4px 0;font-family:monospace">${err}</div>`;
    });
    html += '</div>';
  }
  if (ev.network_errors?.length) {
    html += '<div class="drawer-section"><h4>Network Errors (' + ev.network_errors.length + ')</h4>';
    ev.network_errors.forEach(err => {
      html += `<div style="font-size:12px;color:var(--red);padding:4px 0;font-family:monospace">${err}</div>`;
    });
    html += '</div>';
  }

  // Screenshots gallery
  const prefix = `${platform === 'ios' ? 'ios' : 'web'}-s${ev.sprint}-`;
  const sprintScreenshots = Object.entries(SCREENSHOTS).filter(([k]) => k.startsWith(prefix)).sort((a,b) => a[0].localeCompare(b[0]));
  if (sprintScreenshots.length) {
    html += `<div class="drawer-section"><h4>Screenshots (${sprintScreenshots.length})</h4>`;
    html += '<div class="drawer-screenshots">';
    sprintScreenshots.forEach(([name, dataUrl]) => {
      html += `<div class="drawer-thumb" onclick="openLightbox('${name}')"><img src="${dataUrl}" alt="${name}" loading="lazy"><div class="caption">${name.replace('.png','').replace(prefix,'')}</div></div>`;
    });
    html += '</div></div>';
  }

  // Cross-link to generator
  const genPlatform = platform === 'ios' ? 'gen-ios' : 'gen-web';
  const handoffs = getHandoffsFor(platform);
  if (handoffs.length > sprintIdx) {
    html += `<button class="drawer-link-btn" onclick="switchToAgent('${genPlatform}', ${sprintIdx})">View Generator Handoff →</button>`;
  }

  return html;
}

// ===== Verdict Body =====
function renderVerdictBody() {
  let html = '';

  // Combine all evals
  const allEvals = [];
  EVALS.forEach(ev => allEvals.push({ ...ev, platform: 'web' }));
  IOS_EVALS.forEach(ev => allEvals.push({ ...ev, platform: 'ios' }));

  if (allEvals.length === 0) {
    return '<p style="color:var(--fg3);text-align:center;padding:40px 0">No evaluations found.</p>';
  }

  // Overall result
  const allPass = allEvals.every(ev => ev.pass);
  const passCount = allEvals.filter(ev => ev.pass).length;

  html += '<div style="text-align:center;margin-bottom:24px">';
  html += `<div class="verdict-badge ${allPass ? 'pass' : 'fail'}" style="font-size:18px;padding:8px 24px;display:inline-block">${allPass ? 'ALL PASSED' : 'SOME FAILED'}</div>`;
  html += `<div style="font-size:13px;color:var(--fg3);margin-top:8px">${passCount} of ${allEvals.length} evaluations passed</div>`;
  html += '</div>';

  // Threshold explanation
  html += '<div class="threshold-box">';
  html += 'Pass requires: <code>functionality ≥ 7</code> AND <code>average ≥ 7.0</code>';
  html += '</div>';

  // Per-eval rows
  html += '<div class="drawer-section"><h4>Sprint Results</h4>';

  // Group by platform
  const platforms = [...new Set(allEvals.map(e => e.platform))];
  platforms.forEach(plat => {
    const platEvals = allEvals.filter(e => e.platform === plat);
    if (platforms.length > 1) {
      html += `<div style="font-size:11px;color:var(--fg3);text-transform:uppercase;letter-spacing:1px;margin:16px 0 8px;padding-bottom:4px;border-bottom:1px solid var(--border)">${plat}</div>`;
    }
    platEvals.forEach(ev => {
      html += `<div class="verdict-row">`;
      html += `<div class="sprint-num" style="color:var(--accent)">Sprint ${ev.sprint}</div>`;
      html += `<div class="scores-mini">`;
      html += `<span>Func: <strong style="color:${(ev.scores.functionality||0) >= 7 ? 'var(--green)' : 'var(--red)'}">${ev.scores.functionality||0}</strong></span>`;
      html += `<span>Design: <strong>${ev.scores.design_quality||0}</strong></span>`;
      html += `<span>Craft: <strong>${ev.scores.craft||0}</strong></span>`;
      html += `<span>Orig: <strong>${ev.scores.originality||0}</strong></span>`;
      html += `<span>Avg: <strong style="color:${ev.average >= 7.0 ? 'var(--green)' : 'var(--red)'}">${ev.average.toFixed(1)}</strong></span>`;
      html += `</div>`;
      html += `<div class="verdict-badge ${ev.pass ? 'pass' : 'fail'}">${ev.pass ? 'PASS' : 'FAIL'}</div>`;
      html += `</div>`;
    });
  });
  html += '</div>';

  // Score progression
  if (EVALS.length > 1 || IOS_EVALS.length > 1) {
    html += '<div class="drawer-section"><h4>Score Progression</h4>';
    const drawProgression = (evals, label) => {
      if (evals.length <= 1) return '';
      let out = '';
      if (label) out += `<div style="font-size:11px;color:var(--fg3);margin-bottom:8px">${label}</div>`;
      const metrics = ['functionality', 'design_quality', 'craft', 'originality'];
      metrics.forEach(metric => {
        const vals = evals.map(ev => ev.scores[metric] || 0);
        const delta = vals[vals.length - 1] - vals[0];
        const deltaColor = delta > 0 ? 'var(--green)' : delta < 0 ? 'var(--red)' : 'var(--fg3)';
        const deltaStr = delta > 0 ? `+${delta}` : `${delta}`;
        out += `<div class="drawer-row"><span class="row-label">${metric.replace('_',' ')}</span><span>${vals.join(' → ')} <span style="color:${deltaColor};font-weight:600;margin-left:4px">(${deltaStr})</span></span></div>`;
      });
      return out;
    };
    if (EVALS.length > 1) html += drawProgression(EVALS, platforms.length > 1 ? 'Web' : '');
    if (IOS_EVALS.length > 1) html += drawProgression(IOS_EVALS, 'iOS');
    html += '</div>';
  }

  return html;
}

// ===== Main page rendering (unchanged logic) =====

function renderTrend() {
  const container = document.getElementById('trend-chart');
  const colors = { functionality: 'var(--green)', design_quality: 'var(--accent)', craft: 'var(--yellow)', originality: 'var(--orange)' };
  let html = '<div style="display:flex;align-items:end;gap:24px;height:120px;padding:0 16px">';

  EVALS.forEach((ev, i) => {
    html += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">';
    html += '<div style="display:flex;gap:3px;align-items:end;height:100px;width:100%">';
    for (const [key, color] of Object.entries(colors)) {
      const val = ev.scores[key] || 0;
      const h = (val / 10) * 100;
      html += `<div class="trend-bar" style="height:${h}%;background:${color};flex:1" data-tooltip="${key}: ${val}"></div>`;
    }
    html += '</div>';
    html += `<div style="font-size:12px;color:var(--fg3)">Sprint ${ev.sprint}</div>`;
    html += `<div style="font-size:16px;font-weight:700;color:${ev.pass ? 'var(--green)' : 'var(--red)'}">${ev.average.toFixed(1)}</div>`;
    html += '</div>';
  });

  html += '</div>';
  container.innerHTML = html;
}

function renderTimeline() {
  const tl = document.getElementById('timeline');
  let html = '';

  html += `<div class="timeline-item planner"><div class="tl-label">Planner</div><div class="tl-title">Product Spec Generated</div><div class="tl-desc">Complexity: ${META.complexity} · ${META.sprints?.length || 0} sprints · ${META.shared_backend ? 'Shared backend' : 'No shared backend'}</div></div>`;

  EVALS.forEach((ev, i) => {
    const ho = HANDOFFS[i];
    const features = ho?.completed_features?.length || 0;

    html += `<div class="timeline-item generator"><div class="tl-label">Generator · Sprint ${ev.sprint}</div><div class="tl-title">${META.sprints?.[i]?.title || 'Sprint ' + ev.sprint}</div><div class="tl-desc">${features} features implemented · Attempt ${ev.attempt}</div></div>`;

    const passStr = ev.pass ? '<span style="color:var(--green)">PASS</span>' : '<span style="color:var(--red)">FAIL</span>';
    html += `<div class="timeline-item evaluator"><div class="tl-label">Evaluator · Sprint ${ev.sprint}</div><div class="tl-title">Scores: ${ev.scores.functionality}/${ev.scores.design_quality}/${ev.scores.craft}/${ev.scores.originality} → ${ev.average.toFixed(1)} ${passStr}</div><div class="tl-desc">${ev.issues?.length || 0} issues found · ${ev.done_conditions_results?.filter(d=>d.pass).length}/${ev.done_conditions_results?.length} conditions passed · ${ev.screenshots_taken?.length || 0} screenshots</div></div>`;
  });

  tl.innerHTML = html;
}

function renderTabs() {
  const tabs = document.getElementById('sprint-tabs');
  let html = '';
  EVALS.forEach((ev, i) => {
    const isActive = i === 0 ? 'active' : '';
    html += `<button class="sprint-tab ${isActive}" onclick="showSprint(${i})">Sprint ${ev.sprint} — ${ev.pass ? '✓' : '✗'} ${ev.average.toFixed(1)}</button>`;
  });
  tabs.innerHTML = html;
  showSprint(0);
}

function showSprint(idx) {
  document.querySelectorAll('.sprint-tab').forEach((t, i) => t.classList.toggle('active', i === idx));

  const ev = EVALS[idx];
  const ho = HANDOFFS[idx];
  const detail = document.getElementById('sprint-detail');

  let html = '';

  // Scores
  html += '<div class="scores-grid">';
  const scoreColors = { functionality: 'var(--green)', design_quality: 'var(--accent)', craft: 'var(--yellow)', originality: 'var(--orange)' };
  for (const [key, color] of Object.entries(scoreColors)) {
    const val = ev.scores[key] || 0;
    html += `<div class="score-card"><div class="label">${key.replace('_',' ')}</div><div class="value" style="color:${color}">${val}</div><div class="bar"><div class="bar-fill" style="width:${val*10}%;background:${color}"></div></div></div>`;
  }
  html += `<div class="score-card"><div class="label">Average</div><div class="value" style="color:${ev.pass ? 'var(--green)' : 'var(--red)'}">${ev.average.toFixed(1)}</div><div class="bar"><div class="bar-fill" style="width:${ev.average*10}%;background:${ev.pass ? 'var(--green)' : 'var(--red)'}"></div></div></div>`;
  html += '</div>';

  // Done conditions
  if (ev.done_conditions_results?.length) {
    html += '<div class="section"><h3>Done Conditions</h3>';
    ev.done_conditions_results.forEach(dc => {
      html += `<div class="dc-item"><div class="dc-id">${dc.id}</div><div class="dc-badge ${dc.pass ? 'pass' : 'fail'}">${dc.pass ? 'PASS' : 'FAIL'}</div><div class="dc-content"><div class="desc">${dc.description}</div>${dc.notes ? `<div class="notes">${dc.notes}</div>` : ''}</div></div>`;
    });
    html += '</div>';
  }

  // Issues
  if (ev.issues?.length) {
    html += '<div class="section"><h3>Issues Found</h3>';
    ev.issues.forEach(issue => {
      html += `<div class="issue ${issue.severity}"><div class="issue-header"><span class="severity" style="color:${issue.severity==='high'?'var(--red)':issue.severity==='medium'?'var(--yellow)':'var(--accent)'}">${issue.severity}</span><span class="category">${issue.category}</span></div><div class="issue-desc">${issue.description}</div>${issue.fix_suggestion ? `<div class="fix">Fix: ${issue.fix_suggestion}</div>` : ''}</div>`;
    });
    html += '</div>';
  }

  // Features built
  if (ho?.completed_features?.length) {
    html += '<div class="section"><h3>Features Built (Generator Handoff)</h3><ul class="features-list">';
    ho.completed_features.forEach(f => {
      html += `<li><span class="story-id">${f.story_id}</span><span>${f.description}${f.notes ? ` <span style="color:var(--fg3)">— ${f.notes}</span>` : ''}</span></li>`;
    });
    html += '</ul></div>';
  }

  // Screenshots
  const prefix = `web-s${ev.sprint}-`;
  const sprintScreenshots = Object.entries(SCREENSHOTS).filter(([k]) => k.startsWith(prefix)).sort((a,b) => a[0].localeCompare(b[0]));

  if (sprintScreenshots.length) {
    html += '<div class="section"><h3>Screenshots (' + sprintScreenshots.length + ')</h3><div class="screenshots-grid">';
    sprintScreenshots.forEach(([name, dataUrl]) => {
      html += `<div class="screenshot-card" onclick="openLightbox('${name}')"><img src="${dataUrl}" alt="${name}" loading="lazy"><div class="caption">${name.replace('.png','').replace(prefix,'')}</div></div>`;
    });
    html += '</div></div>';
  }

  detail.innerHTML = html;
}

function openLightbox(name) {
  const lb = document.getElementById('lightbox');
  document.getElementById('lightbox-img').src = SCREENSHOTS[name];
  lb.classList.add('open');
}

function renderGitLog() {
  const el = document.getElementById('git-log');
  el.innerHTML = GIT_LOG.split('\n').map(line => {
    const [hash, ...rest] = line.split(' ');
    return hash ? `<span class="hash">${hash}</span> ${rest.join(' ')}` : '';
  }).join('\n');
}

// Detect skipped platforms and dim nodes
function updatePipelineNodes() {
  const iosNode = document.getElementById('node-gen-ios');
  const iosEvalNode = document.getElementById('node-eval-ios');
  const webNode = document.getElementById('node-gen-web');
  const webEvalNode = document.getElementById('node-eval-web');

  if (IOS_HANDOFFS.length === 0 && IOS_EVALS.length === 0) {
    if (iosNode) iosNode.style.opacity = '0.3';
    if (iosEvalNode) iosEvalNode.style.opacity = '0.3';
  } else {
    if (iosNode) { iosNode.style.opacity = '1'; const s = iosNode.querySelector('.status'); if (s) s.style.background = 'var(--green)'; }
    if (iosEvalNode) { iosEvalNode.style.opacity = '1'; const s = iosEvalNode.querySelector('.status'); if (s) s.style.background = 'var(--green)'; }
  }

  if (HANDOFFS.length === 0 && EVALS.length === 0) {
    if (webNode) webNode.style.opacity = '0.3';
    if (webEvalNode) webEvalNode.style.opacity = '0.3';
  }
}

// Init
updatePipelineNodes();
renderTrend();
renderTimeline();
renderTabs();
renderGitLog();
</script>
</body>
</html>
JSEOF

echo "Report generated at: $OUTPUT"
echo "Open with: open $OUTPUT"
