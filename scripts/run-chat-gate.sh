#!/usr/bin/env bash
set -u
fail=0
node --test tests/chatV2/*.test.js || fail=1
for f in $(find services/chatV2 -name '*.js' -type f); do node --check "$f" || fail=1; done
node scripts/chat-benchmark.js || fail=1
cd ../frontend || exit 1
npm run lint || fail=1
npm run build:customer || fail=1
npm run build:admin || fail=1
exit $fail
