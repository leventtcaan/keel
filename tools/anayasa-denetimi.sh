#!/usr/bin/env bash
# The constitution audit in one command (K-804, ADR-061): U4, U6, person names (K-523) and K2 over the app's text and
# code, the legal pages and the store listing; the data inventory (V1, V6); the server's architecture rules.
# CI runs each part in its own job; tools/test_anayasa_denetimi.py keeps this list whole. Run from the repository root.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== data inventory (K-801, K-802)"
python3 tools/test_veri_envanteri.py

echo "== app: text, code and store scans"
MOBILE_SUITES=(
  forbidden-phrases.test.ts
  copy-literals.test.ts
  copy-keys.test.ts
  scanners.test.ts
  tokens.test.ts
  typography.test.ts
  share-card.test.ts
  parameters.test.ts
  routes-protected.test.ts
)
(cd apps/mobile && npx jest --ci "${MOBILE_SUITES[@]/#/src/__tests__/}")

echo "== server: architecture rules (no database)"
(cd backend && ./gradlew test --console=plain --tests 'app.keel.architecture.*')

echo "constitution audit: passed"
