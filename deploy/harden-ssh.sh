#!/usr/bin/env bash
# SSH by key only, never as root (K-901, ADR-065) — run on the Mac after provision.sh:  deploy/harden-ssh.sh [host]
# It first logs in as keel with a key and checks sudo; only then are root and passwords closed. The file sorts before
# cloud-init's 50-cloud-init.conf, which turns passwords on: sshd takes the first value it reads.
set -euo pipefail
host=${1:-keel-vps}
address=$(ssh -G "$host" | awk '$1 == "hostname" {print $2}')
ssh -o BatchMode=yes -o User=keel "$address" 'sudo -n true' || { echo "keel cannot log in with a key and sudo: nothing changed" >&2; exit 1; }
ssh -o BatchMode=yes -o User=keel "$address" 'sudo tee /etc/ssh/sshd_config.d/10-keel.conf >/dev/null <<CONF
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
CONF
sudo sshd -t && sudo systemctl restart ssh'
echo "hardened. Set User keel for $host in ~/.ssh/config."
