#!/usr/bin/env bash
# The weekly leading indicators (K-905, ADR-081), run by hand on the VPS, over SSH from the Mac:
#   ssh keel-vps /opt/keel/deploy/weekly-report.sh [--as-of YYYY-MM-DD] [--weeks N]
# Prints one table: a row per sign-up week and a total, with time to first value, week-2 retention and the share who saw
# their plan change (the definitions are the header of weekly-report.sql and ADR-081). Aggregates only: no account, no health
# value. Read-only twice over: the file is one select, and the session refuses any write (default_transaction_read_only).
# No endpoint, no new port, no secret: it is psql inside the database container, reached the way a deploy is, by SSH as keel.
#   --as-of  the report as of that day, 00:00 UTC (default: now); --weeks  how many sign-up weeks back (default: the file's).
set -euo pipefail
dir=$(cd "$(dirname "$0")" && pwd)
as_of=""
weeks=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --as-of) as_of=${2:?--as-of needs a date}; shift 2 ;;
    --weeks) weeks=${2:?--weeks needs a number}; shift 2 ;;
    *) echo "usage: weekly-report.sh [--as-of YYYY-MM-DD] [--weeks N]" >&2; exit 2 ;;
  esac
done
# The values go into SET statements: only the shapes below get through.
if [[ -n $as_of && ! $as_of =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then echo "--as-of: YYYY-MM-DD" >&2; exit 2; fi
if [[ -n $as_of && $as_of > $(date -u +%F) ]]; then echo "--as-of: not in the future (nothing has happened yet)" >&2; exit 2; fi
if [[ -n $weeks && ! $weeks =~ ^[0-9]{1,2}$ ]]; then echo "--weeks: a number up to 99" >&2; exit 2; fi

{
  if [[ -n $as_of ]]; then printf "set keel.report_as_of = '%s 00:00+00';\n" "$as_of"; fi
  if [[ -n $weeks ]]; then printf "set keel.cohort_weeks = '%s';\n" "$weeks"; fi
  cat "$dir/weekly-report.sql"
} | "$dir/kc" exec -T -e PGOPTIONS='-c default_transaction_read_only=on' postgres \
    psql -X -q -v ON_ERROR_STOP=1 -P pager=off -U keel -d keel
