#!/bin/bash
# Multi-Agent Harness Configuration

export HARNESS_ROOT="/Users/colin/harness10"
export CLAUDE_BIN="/Users/colin/.local/bin/claude"
export MODEL="claude-opus-4-6"

# iOS Simulator — update UDID to match your available device
# List available: xcrun simctl list devices available
export IOS_SIMULATOR_UDID=""
export IOS_SIMULATOR_NAME="iPhone 16 Pro"

# Web dev server
export WEB_PORT=3000

# Retry and budget limits
export MAX_RETRIES=2
export PLANNER_BUDGET=5
export GENERATOR_BUDGET=80
export EVALUATOR_BUDGET=20
export TOTAL_BUDGET_CAP=400

# Paths
export SPECS_DIR="$HARNESS_ROOT/artifacts/specs"
export HANDOFFS_DIR="$HARNESS_ROOT/artifacts/handoffs"
export CONTRACTS_DIR="$HARNESS_ROOT/artifacts/contracts"
export EVALS_DIR="$HARNESS_ROOT/artifacts/evaluations"
export SCREENSHOTS_DIR="$HARNESS_ROOT/artifacts/screenshots"
export PROMPTS_DIR="$HARNESS_ROOT/prompts"
export BUDGET_FILE="$HARNESS_ROOT/artifacts/.budget-tracker"
