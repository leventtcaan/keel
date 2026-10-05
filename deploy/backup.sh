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
trap 'rm -f "$part"' EXIT

# pipefail: a failing pg_dump fails the backup instead of writing an empty file.
/opt/keel/deploy/kc exec -T postgres pg_dump -U keel -d keel --format=custom | age -R /opt/keel/backup-recipient.txt > "$part"
chgrp keel-backup "$part"
mv "$part" "$dir/keel-$stamp.dump.age"

find "$dir" -name 'keel-*.dump.age' -type f -mmin +$((BACKUP_KEEP_DAYS_SERVER * 24 * 60)) -delete
echo "backup keel-$stamp.dump.age ($(stat -c %s "$dir/keel-$stamp.dump.age") bytes)"
