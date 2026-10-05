#!/usr/bin/env bash
# Pulls the server's encrypted backups to this Mac (K-901, ADR-065), every hour while it is awake (launchd,
# deploy/mac/install-pull.sh). The key only reads /var/backups/keel (rrsync -ro on the server). Kept here
# BACKUP_KEEP_DAYS_MAC days from when the server made them (rsync keeps the time), then deleted.
set -euo pipefail
source "$(dirname "$0")/../retention.env"
dest="$HOME/KeelBackups"
install -d -m 700 "$dest"
rsync -rt --include='keel-*.dump.age' --exclude='*' keel-backup: "$dest/"
find "$dest" -name 'keel-*.dump.age' -type f -mmin +$((BACKUP_KEEP_DAYS_MAC * 24 * 60)) -delete
echo "$(date -u +%FT%TZ) pulled; $(ls "$dest" | wc -l | tr -d ' ') backups here"
