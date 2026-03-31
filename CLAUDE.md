# Harness10 Multi-Platform App Builder

This is an automated multi-agent harness that builds iOS (SwiftUI) and web (Next.js 16) apps from a single product specification.

## Project Structure
- `artifacts/specs/` — Product specifications (read by all agents)
- `artifacts/handoffs/` — Structured handoff documents between agents
- `artifacts/contracts/` — Sprint contracts with testable done conditions
- `artifacts/evaluations/` — Evaluator reports with scores and feedback
- `artifacts/screenshots/` — Screenshots captured during evaluation
- `shared/` — Shared API contracts and design tokens
- `web/` — Next.js 16 web application
- `ios/` — SwiftUI iOS application
- `prompts/` — Agent system prompts
- `scripts/` — Orchestration scripts
- `templates/` — Schema templates for artifacts

## Rules for All Agents
- ALWAYS read `artifacts/specs/current-spec.md` before starting work
- ALWAYS write a handoff document to `artifacts/handoffs/` when finishing work
- ALWAYS commit to git after logical units of work with descriptive messages
- NEVER modify files outside your designated directory (`web/` or `ios/`)
- If evaluator feedback exists from a previous attempt in `artifacts/evaluations/`, read it and address EVERY issue listed
- Reference `shared/api-contract.md` when implementing API endpoints or network calls
- Reference `templates/` for the expected format of all artifact files
