#!/usr/bin/env bash
# Pulls the server's encrypted backups to this Mac (K-901, ADR-065), every hour while it is awake (launchd,
# deploy/mac/install-pull.sh). The key only reads /var/backups/keel (rrsync -ro on the server). Kept here
# BACKUP_KEEP_DAYS_MAC days from when the server made them (rsync keeps the time), then deleted — and never copied on by
# Time Machine, or they would outlive that (the privacy policy's promise). A newest backup older than BACKUP_ALERT_HOURS
# is told with a notification: a failing backup on the server is otherwise silent.
set -euo pipefail
source "$(dirname "$0")/../retention.env"
dest="$HOME/KeelBackups"
install -d -m 700 "$dest"
tmutil addexclusion "$dest"
rsync -rt --include='keel-*.dump.age' --include='keel-*.counts' --exclude='*' keel-backup: "$dest/"
find "$dest" -name 'keel-*' -type f -mmin +$((BACKUP_KEEP_DAYS_MAC * 24 * 60)) -delete

newest=$(ls -1t "$dest"/keel-*.dump.age 2>/dev/null | head -1 || true)
if [[ -z $newest || -n $(find "$newest" -mmin +$((BACKUP_ALERT_HOURS * 60))) ]]; then
  osascript -e "display notification \"No backup newer than $BACKUP_ALERT_HOURS hours. Check keel-backup.service on the server.\" with title \"keel backups\""
  echo "$(date -u +%FT%TZ) STALE: newest is ${newest:-none}" >&2
  exit 1
fi
echo "$(date -u +%FT%TZ) pulled; newest $(basename "$newest")"
