#!/bin/bash
# Generate an interactive HTML report from harness artifacts
set -euo pipefail

HARNESS_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT="$HARNESS_ROOT/report.html"

# Collect all data into JS variables
SPEC_CONTENT=$(cat "$HARNESS_ROOT/artifacts/specs/current-spec.md" 2>/dev/null | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")
META=$(cat "$HARNESS_ROOT/artifacts/specs/current-meta.json" 2>/dev/null || echo '{}')

EVALS="["
first=true
for f in "$HARNESS_ROOT"/artifacts/evaluations/web-eval-*.json; do
  [ -f "$f" ] || continue
  $first || EVALS+=","
  EVALS+="$(cat "$f")"
  first=false
done
EVALS+="]"

HANDOFFS="["
first=true
for f in "$HARNESS_ROOT"/artifacts/handoffs/web-handoff-*.json; do
  [ -f "$f" ] || continue
  $first || HANDOFFS+=","
  HANDOFFS+="$(cat "$f")"
  first=false
done
HANDOFFS+="]"

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
  .architecture h2 { font-size: 16px; color: var(--fg2); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 24px; }

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
  .lightbox { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 100; align-items: center; justify-content: center; cursor: pointer; }
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

  @media (max-width: 768px) {
    .pipeline { flex-direction: column; }
    .arrow { transform: rotate(90deg); }
    .scores-grid { grid-template-columns: repeat(2, 1fr); }
    .screenshots-grid { grid-template-columns: 1fr; }
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
    <div class="pipeline">
      <div class="agent-node" id="node-planner">
        <div class="status" style="background:var(--green)"></div>
        <div class="role">Agent 1</div>
        <div class="name">Planner</div>
        <div class="tools">Read-only</div>
      </div>
      <div class="arrow">→</div>
      <div class="parallel-group">
        <div class="parallel-label">parallel</div>
        <div class="agent-node" id="node-gen-web">
          <div class="status" style="background:var(--green)"></div>
          <div class="role">Agent 2a</div>
          <div class="name">Gen-Web</div>
          <div class="tools">Read/Write/Edit/Bash</div>
        </div>
        <div class="agent-node" id="node-gen-ios" style="opacity:0.3">
          <div class="role">Agent 2b</div>
          <div class="name">Gen-iOS</div>
          <div class="tools">skipped</div>
        </div>
      </div>
      <div class="arrow">→</div>
      <div class="parallel-group">
        <div class="parallel-label">parallel</div>
        <div class="agent-node" id="node-eval-web">
          <div class="status" style="background:var(--green)"></div>
          <div class="role">Agent 3a</div>
          <div class="name">Eval-Web</div>
          <div class="tools">Claude Preview MCP</div>
        </div>
        <div class="agent-node" id="node-eval-ios" style="opacity:0.3">
          <div class="role">Agent 3b</div>
          <div class="name">Eval-iOS</div>
          <div class="tools">skipped</div>
        </div>
      </div>
      <div class="arrow">→</div>
      <div class="agent-node">
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

<script>
HTMLEOF

# Inject data
cat >> "$OUTPUT" << DATAEOF
const META = $META;
const EVALS = $EVALS;
const HANDOFFS = $HANDOFFS;
const SCREENSHOTS = $SCREENSHOTS;
const GIT_LOG = $GIT_LOG;
const SPEC = $SPEC_CONTENT;
DATAEOF

cat >> "$OUTPUT" << 'JSEOF'

// Render score trend chart
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

// Render timeline
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

// Render sprint tabs
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

// Show sprint detail
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

  // Features built (from handoff)
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

// Git log
function renderGitLog() {
  const el = document.getElementById('git-log');
  el.innerHTML = GIT_LOG.split('\n').map(line => {
    const [hash, ...rest] = line.split(' ');
    return hash ? `<span class="hash">${hash}</span> ${rest.join(' ')}` : '';
  }).join('\n');
}

// Init
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
