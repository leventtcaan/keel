#!/usr/bin/env bash
# The daily backup (K-901, ADR-065), run by keel-backup.timer as root. The whole database (pg_dump, custom format) is
# encrypted on the server to the public key in /opt/keel/backup-recipient.txt: the server can write a backup but never read
# one — the private key is only on the controller's Mac. Kept BACKUP_KEEP_DAYS_SERVER days here (retention.env); the Mac
# pulls them (deploy/mac/pull-backups.sh).
set -euo pipefail
source /opt/keel/deploy/retention.env
dir=/var/backups/keel
umask 027
stamp=$(date -u +%Y%m%dT%H%M%SZ)
part="$dir/.keel-$stamp.dump.age.part"
trap 'rm -f "$part" "$dir/.keel-$stamp.counts.part"' EXIT

# A part a reboot or a kill left behind.
find "$dir" -name '.keel-*.part' -type f -mmin +60 -delete

# Every table's row count, taken just before the dump: the restore drill compares with these, not with the live database
# (which moves on after 02:30). Table names and counts only — nothing about anyone. Empty means it failed.
/opt/keel/deploy/kc exec -T postgres psql -v ON_ERROR_STOP=1 -U keel -d keel -At < /opt/keel/deploy/table-counts.sql > "$dir/.keel-$stamp.counts.part"
[[ -s "$dir/.keel-$stamp.counts.part" ]] || { echo "no table counts" >&2; exit 1; }

# pipefail: a failing pg_dump fails the backup instead of writing an empty file.
/opt/keel/deploy/kc exec -T postgres pg_dump -U keel -d keel --format=custom | age -R /opt/keel/backup-recipient.txt > "$part"
chgrp keel-backup "$part" "$dir/.keel-$stamp.counts.part"
mv "$dir/.keel-$stamp.counts.part" "$dir/keel-$stamp.counts"
mv "$part" "$dir/keel-$stamp.dump.age"

find "$dir" -name 'keel-*' -type f -mmin +$((BACKUP_KEEP_DAYS_SERVER * 24 * 60)) -delete
echo "backup keel-$stamp.dump.age ($(stat -c %s "$dir/keel-$stamp.dump.age") bytes)"
