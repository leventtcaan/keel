#!/usr/bin/env bash
# The restore drill (K-901, ADR-065), on the Mac: the newest pulled backup is decrypted here (the private key never leaves
# the Mac), restored into a throwaway PostgreSQL on the VPS that has no network and no disk (tmpfs), and every table's
# row count is compared with the live database's. The throwaway container is removed at the end, whatever happens.
#   deploy/restore-drill.sh
set -euo pipefail
host=${KEEL_HOST:-keel-vps}
key=${KEEL_BACKUP_KEY:-$HOME/.keel-backup/age-key.txt}
backup=$(ls -1t "$HOME"/KeelBackups/keel-*.dump.age | head -1)
image=$(sed -nE 's/^ +image: (postgres:[^ ]+)$/\1/p' "$(git rev-parse --show-toplevel)/deploy/compose.yaml")
drill=keel-restore-drill
echo "backup: $(basename "$backup")"

ssh "$host" "docker run -d --rm --name $drill --network none --tmpfs /var/lib/postgresql \
  -e POSTGRES_USER=keel -e POSTGRES_DB=keel -e POSTGRES_HOST_AUTH_METHOD=trust $image >/dev/null"
trap 'ssh "$host" "docker rm -f $drill >/dev/null 2>&1 || true"' EXIT
ssh "$host" "for _ in \$(seq 1 30); do docker exec $drill pg_isready -U keel -d keel -q && exit 0; sleep 1; done; exit 1"

age -d -i "$key" "$backup" | ssh "$host" "docker exec -i $drill pg_restore -U keel -d keel --no-owner --exit-on-error"

# Every table outside PostgreSQL's own, exact counts (count(*), not statistics).
counts='select format($$select %L || $$|$$ || count(*) from %I.%I$$, schemaname || $$.$$ || tablename, schemaname, tablename)
  from pg_tables where schemaname not in ($$pg_catalog$$, $$information_schema$$) order by 1 \gexec'
live=$(ssh "$host" "/opt/keel/deploy/kc exec -T postgres psql -U keel -d keel -At" <<<"$counts")
restored=$(ssh "$host" "docker exec -i $drill psql -U keel -d keel -At" <<<"$counts")
echo "tables: $(wc -l <<<"$restored" | tr -d ' ') restored, $(wc -l <<<"$live" | tr -d ' ') live"
if diff <(echo "$live") <(echo "$restored"); then
  echo "restore drill: every table's row count equals the live database's"
else
  echo "restore drill: counts differ (rows written since the backup show here)" >&2
  exit 1
fi
