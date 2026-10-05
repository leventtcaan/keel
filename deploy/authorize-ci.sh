#!/usr/bin/env bash
# Lets the CI deploy key in, able to run the forced command only (K-902, ADR-066). On the Mac, once, after a deploy:
#   deploy/authorize-ci.sh ~/.ssh/keel_ci_deploy.pub [host]
# The command is installed root-owned outside /opt/keel, so the key (which runs as keel) cannot change it; release.sh
# keeps it in step with main. The private half goes to GitHub as the production environment's secret (deploy/README.md).
set -euo pipefail
pub=${1:?usage: authorize-ci.sh <public key file> [host]}
host=${2:-keel-vps}
key=$(cat "$pub")
[[ $key =~ ^ssh-ed25519\ [A-Za-z0-9+/=]+(\ [A-Za-z0-9._@-]+)?$ ]] || { echo "not one ed25519 public key: $pub" >&2; exit 1; }
line="restrict,command=\"/usr/local/lib/keel/ci-deploy\" $key"
ssh "$host" "sudo install -d -o root -g root -m 755 /usr/local/lib/keel &&
  sudo install -o root -g root -m 755 /opt/keel/deploy/ci-deploy.sh /usr/local/lib/keel/ci-deploy &&
  { grep -qxF '$line' ~/.ssh/authorized_keys || echo '$line' >> ~/.ssh/authorized_keys; }"
echo "authorized on $host: the CI key runs /usr/local/lib/keel/ci-deploy only"
