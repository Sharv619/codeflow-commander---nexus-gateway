#!/usr/bin/env bash
# Simple pre-push guard: large files, obvious secrets, and run tests if package.json changed
# Usage: ./scripts/prevent-stupid-push.sh [--range <ref..ref>] [--dry-run]
set -euo pipefail

DRY_RUN=false
RANGE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --range)
      RANGE="$2"
      shift 2
      ;;
    *)
      # If no --range specified, treat first arg as range
      if [ -z "$RANGE" ]; then
        RANGE="$1"
      fi
      shift
      ;;
  esac
done

# Default range if none specified
RANGE=${RANGE:-origin/main..HEAD}

echo "Checking push range: ${RANGE} (dry-run=${DRY_RUN})"

files=$(git diff --name-only --diff-filter=ACMRT ${RANGE} || true)

if [ -z "$files" ]; then
  echo "No changed files found in range."
  exit 0
fi

EXIT_CODE=0

# check large files (>5MB)
MAX_BYTES=$((5 * 1024 * 1024))
for f in $files; do
  if [ -f "$f" ]; then
    size=$(wc -c < "$f" || echo 0)
    if [ "$size" -gt "$MAX_BYTES" ]; then
      echo "ERROR: Large file detected (>5MB): $f ($size bytes)"
      EXIT_CODE=1
    fi
  fi
done

# simple secrets regex
secret_regex='password|apiKey|api_key|secret|SECRET|ACCESS_TOKEN|PRIVATE_KEY|PRIVATE-KEY|KEY='
for f in $files; do
  if [ -f "$f" ]; then
    if grep -nE --binary-files=without-match "${secret_regex}" "$f" >/dev/null 2>&1; then
      echo "ERROR: Potential secret found in $f"
      grep -nE --color=always "${secret_regex}" "$f" || true
      EXIT_CODE=1
    fi
  fi
done

# if package.json changed, ensure tests run
if echo "$files" | grep -q -E '^package.json$' || echo "$files" | grep -q -E '(^|/)package.json$'; then
  echo "package.json changed — running npm test in affected package(s)"
  if [ "${DRY_RUN}" = "false" ]; then
    if command -v npm >/dev/null 2>&1; then
      npm test || { echo "ERROR: tests failed"; EXIT_CODE=1; }
    else
      echo "WARN: npm not available to run tests"
    fi
  else
    echo "(dry-run) skipping npm test"
  fi
fi

if [ $EXIT_CODE -ne 0 ]; then
  echo "Prevent-stupid-push checks failed."
  exit $EXIT_CODE
fi

echo "Prevent-stupid-push checks passed."
exit 0
