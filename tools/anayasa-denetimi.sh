#!/usr/bin/env bash
# The constitution audit in one command (K-804, ADR-061): U4, U6, person names (K-523), K2, no long or middle dash and the
# new face's word budgets (ADR-070 #7, K-952) over the app's text and
# code, the legal pages and the store listing; every route behind its guard; the data inventory (V1, V6); the server's
# architecture rules and its checks of the coach's text (U1, U4, U6). CI runs each part in its own job;
# tools/test_anayasa_denetimi.py keeps these lists whole. Run from anywhere; nothing here needs a database.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== data inventory (K-801, K-802)"
python3 tools/test_veri_envanteri.py

echo "== app: text, code, store listing and routes"
# Each file's first line is "// constitution-audit".
MOBILE_SUITES=(
  forbidden-phrases.test.ts
  copy-literals.test.ts
  copy-keys.test.ts
  copy-dashes.test.ts
  copy-budget.test.ts
  scanners.test.ts
  tokens.test.ts
  typography.test.ts
  share-card.test.ts
  parameters.test.ts
  routes-protected.test.ts
  retired-entries.test.ts
  kv-keys.test.ts
)
(cd apps/mobile && npx --no-install jest --ci "${MOBILE_SUITES[@]/#/src/__tests__/}")

echo "== server: architecture rules and the coach's text checks"
# The database-free tests that read the phrase lists, outside the architecture package (run whole).
SERVER_SUITES=(
  app.keel.coach.ForbiddenWordsTests
  app.keel.coach.MealReplyCheckTests
  app.keel.coach.NoCaloriesFromModelTests
  app.keel.coach.PhotoAnalysisSchemaTests
)
SERVER_ARGS=()
for suite in "${SERVER_SUITES[@]}"; do SERVER_ARGS+=(--tests "$suite"); done
(cd backend && ./gradlew test --console=plain --tests 'app.keel.architecture.*' "${SERVER_ARGS[@]}")

echo "constitution audit: passed"
