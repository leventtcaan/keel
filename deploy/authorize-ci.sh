#!/usr/bin/env bash
# Lets the CI deploy key in, able to run deploy/ci-deploy.sh only (K-902, ADR-066). On the Mac, once:
#   deploy/authorize-ci.sh ~/.ssh/keel_ci_deploy.pub [host]
# The private half goes to GitHub as the production environment's secret KEEL_DEPLOY_SSH_KEY (deploy/README.md).
set -euo pipefail
pub=${1:?usage: authorize-ci.sh <public key file> [host]}
host=${2:-keel-vps}
key=$(cat "$pub")
[[ $key =~ ^ssh-ed25519\ [A-Za-z0-9+/=]+(\ [A-Za-z0-9._@-]+)?$ ]] || { echo "not one ed25519 public key: $pub" >&2; exit 1; }
line="restrict,command=\"/opt/keel/deploy/ci-deploy.sh\" $key"
ssh "$host" "grep -qxF '$line' ~/.ssh/authorized_keys || echo '$line' >> ~/.ssh/authorized_keys"
echo "authorized on $host: the CI key runs deploy/ci-deploy.sh only"
