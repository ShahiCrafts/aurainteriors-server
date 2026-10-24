#!/bin/sh
# Local equivalent of .github/workflows/security.yml.
# Run manually, or hourly from cron, e.g.:
#   0 * * * * cd /path/to/aurainteriors-server && ./scripts/security-scan.sh >> ~/security-scan.log 2>&1
# Exit codes (FA-42): 0 = every gate passed; 1 = a gate found issues
# (tests failed, or npm audit reported high/critical vulnerabilities);
# 2 = the npm audit gate COULD NOT RUN (registry unreachable/blocked),
# which is never reported as success. npm audit needs network access
# to the npm registry (see TESTING.md).
set -e
cd "$(dirname "$0")/.."

echo "== npm ci --ignore-scripts =="
npm ci --ignore-scripts

echo "== test suite (npm test: the full suite, same as CI) =="
npm test

echo "== lint gate (same as CI) =="
npm run lint

echo "== npm audit (high/critical gate) =="
audit_json="$(mktemp)"
npm audit --json > "$audit_json" 2>/dev/null || true
node scripts/audit-gate.js "$audit_json"
rm -f "$audit_json"

if command -v semgrep >/dev/null 2>&1; then
  echo "== semgrep =="
  semgrep scan --config p/javascript --config p/nodejs --config p/secrets --error
else
  echo "== semgrep: not installed locally, skipped (CI runs it) =="
fi

if command -v gitleaks >/dev/null 2>&1; then
  echo "== gitleaks =="
  gitleaks detect --redact --no-banner
else
  echo "== gitleaks: not installed locally, skipped (CI + pre-commit run it) =="
fi

echo "== done =="
