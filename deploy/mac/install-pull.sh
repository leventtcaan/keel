#!/usr/bin/env bash
# Installs the hourly backup pull on this Mac (K-901): a launchd agent that runs deploy/mac/pull-backups.sh from this
# checkout. Once: deploy/mac/install-pull.sh. Its log: ~/Library/Logs/keel-backup-pull.log.
set -euo pipefail
script="$(cd "$(dirname "$0")" && pwd)/pull-backups.sh"
plist="$HOME/Library/LaunchAgents/app.keel.backup-pull.plist"
cat > "$plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>app.keel.backup-pull</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$script</string></array>
  <key>StartInterval</key><integer>3600</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/keel-backup-pull.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/keel-backup-pull.log</string>
</dict>
</plist>
PLIST
launchctl bootout "gui/$(id -u)/app.keel.backup-pull" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$plist"
echo "installed: $plist"
