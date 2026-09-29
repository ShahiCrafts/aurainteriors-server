#!/usr/bin/env bash
set -u
fail=0
node --test tests/chatV2/*.test.js || fail=1
node --check services/chatV2/core/pipeline.js || fail=1
node --check services/chatV2/providers/llmGateway.js || fail=1
node --check services/chatV2/tools/registry.js || fail=1
node scripts/chat-benchmark.js || fail=1
exit $fail
