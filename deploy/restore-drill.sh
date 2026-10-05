#!/usr/bin/env bash
# The restore drill (K-901, ADR-065), on the Mac: the newest pulled backup is decrypted here (the private key never leaves
# the Mac), restored into a throwaway PostgreSQL on the VPS that has no network and no disk (tmpfs, bounded), and every
# table's row count is compared with the counts the backup took when it was made (its .counts file). The throwaway
# container is removed at the end, whatever happens; the live database is never written.
#   deploy/restore-drill.sh            (KEEL_DRILL_MEMORY, default 1g: the tmpfs and the container's memory)
set -euo pipefail
host=${KEEL_HOST:-keel-vps}
key=${KEEL_BACKUP_KEY:-$HOME/.keel-backup/age-key.txt}
memory=${KEEL_DRILL_MEMORY:-1g}
backup=$(ls -1t "$HOME"/KeelBackups/keel-*.dump.age | head -1)
expected="${backup%.dump.age}.counts"
[[ -f $expected ]] || { echo "no $(basename "$expected") beside the backup" >&2; exit 1; }
image=$(sed -nE 's/^ +image: (postgres:[^ ]+)$/\1/p' "$(git rev-parse --show-toplevel)/deploy/compose.yaml")
drill=keel-restore-drill
echo "backup: $(basename "$backup")"

ssh "$host" "docker run -d --rm --name $drill --network none --memory $memory --tmpfs /var/lib/postgresql:size=$memory \
  -e POSTGRES_USER=keel -e POSTGRES_DB=keel -e POSTGRES_HOST_AUTH_METHOD=trust $image >/dev/null"
trap 'ssh "$host" "docker rm -f $drill >/dev/null 2>&1 || true"' EXIT
# Over TCP: the image's first start runs a socket-only server, then restarts; only the real one listens on 127.0.0.1.
ssh "$host" "for _ in \$(seq 1 60); do docker exec $drill pg_isready -h 127.0.0.1 -U keel -d keel -q && exit 0; sleep 1; done; exit 1"

age -d -i "$key" "$backup" | ssh "$host" "docker exec -i $drill pg_restore -h 127.0.0.1 -U keel -d keel --no-owner --exit-on-error"

restored=$(ssh "$host" "docker exec -i $drill psql -v ON_ERROR_STOP=1 -h 127.0.0.1 -U keel -d keel -At" < "$(git rev-parse --show-toplevel)/deploy/table-counts.sql")
echo "tables: $(wc -l <<<"$restored" | tr -d ' ') restored, $(wc -l < "$expected" | tr -d ' ') in the backup's counts; rows: $(awk -F'|' '{s+=$2} END {print s+0}' <<<"$restored")"
if diff "$expected" <(echo "$restored"); then
  echo "restore drill: every table and its row count equal the backup's"
else
  echo "restore drill: the restored database differs from what the backup counted" >&2
  exit 1
fi
