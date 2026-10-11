#!/usr/bin/env bash
set -euo pipefail
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
server_dir=$(cd -- "$script_dir/.." && pwd)
web_dir="$server_dir/../aurainteriors-web"
fail=0
cd -- "$server_dir"
node --test tests/chatV2/*.test.js || fail=1
while IFS= read -r -d '' file; do node --check "$file" || fail=1; done < <(find services/chatV2 -name '*.js' -type f -print0)
node scripts/chat-benchmark.js || fail=1
cd -- "$web_dir"
npm run lint || fail=1
npm run build:customer || fail=1
npm run build:admin || fail=1
exit "$fail"
