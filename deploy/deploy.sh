#!/usr/bin/env bash
# Deploys a commit of main to the VPS by hand (K-901, ADR-065; K-902 does the same from CI). On the Mac:
#   deploy/deploy.sh [ref, default origin/main]
# deploy/ and the image are built from that commit exactly (git archive), not from the working tree. release.sh puts
# the image in service and rolls back if /health does not answer.
set -euo pipefail
host=${KEEL_HOST:-keel-vps}
cd "$(git rev-parse --show-toplevel)"
git fetch -q origin
sha=$(git rev-parse --verify "${1:-origin/main}^{commit}")
git merge-base --is-ancestor "$sha" origin/main || { echo "$sha is not on origin/main" >&2; exit 1; }

# deploy/ of that commit replaces the server's.
git archive --format=tar "$sha" deploy | ssh "$host" \
  'set -e; rm -rf /opt/keel/.deploy-new; mkdir /opt/keel/.deploy-new; tar -x -C /opt/keel/.deploy-new;
   rm -rf /opt/keel/deploy; mv /opt/keel/.deploy-new/deploy /opt/keel/deploy; rmdir /opt/keel/.deploy-new'

# The image, built on the server from that commit's data/ and backend/ (the Dockerfile's context, stdin).
git archive --format=tar "$sha" data backend deploy/backend.Dockerfile | ssh "$host" "docker build -q -t keel-backend:$sha -f deploy/backend.Dockerfile -"
ssh "$host" "/opt/keel/deploy/release.sh keel-backend:$sha"
