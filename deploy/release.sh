#!/usr/bin/env bash
# Puts an image in service on the VPS, or puts the previous one back (K-901, ADR-065; K-902 calls it after CI built the
# image). Usage, as keel on the VPS:  release.sh <image>   |   release.sh --rollback
# The image becomes keel-backend:current (compose.yaml), what was current becomes :previous. If /health does not answer
# 200 over HTTPS within the wait, the previous image goes back and the release fails.
set -euo pipefail
cd /opt/keel
kc=/opt/keel/deploy/kc
domain=$(grep -E '^KEEL_DOMAIN=' .env | cut -d= -f2-)
wait_seconds=${KEEL_RELEASE_WAIT:-300} # the first start imports FoodData Central (minutes); later ones take seconds

healthy() {
  for _ in $(seq 1 $((wait_seconds / 5))); do
    curl -fsS --max-time 5 "https://$domain/health" >/dev/null 2>&1 && return 0
    sleep 5
  done
  return 1
}

if [[ ${1:-} == --rollback ]]; then
  docker image inspect keel-backend:previous >/dev/null
  docker tag keel-backend:previous keel-backend:current
  "$kc" up -d
  healthy && echo "rolled back" && exit 0
  echo "rollback did not answer /health" >&2; exit 1
fi

image=${1:?usage: release.sh <image> | --rollback}
docker image inspect "$image" >/dev/null
if docker image inspect keel-backend:current >/dev/null 2>&1; then
  docker tag keel-backend:current keel-backend:previous
fi
docker tag "$image" keel-backend:current
"$kc" up -d --remove-orphans
if healthy; then
  echo "released $image"
  exit 0
fi
echo "$image did not answer /health in ${wait_seconds}s; rolling back" >&2
if docker image inspect keel-backend:previous >/dev/null 2>&1; then
  docker tag keel-backend:previous keel-backend:current
  "$kc" up -d
fi
exit 1
