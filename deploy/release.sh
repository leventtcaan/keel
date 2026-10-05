#!/usr/bin/env bash
# Puts an image in service on the VPS, or puts the previous one back (K-901, ADR-065; K-902 calls it after CI built the
# image). As keel on the VPS:  release.sh <image>   |   release.sh --rollback
# The image becomes keel-backend:current (compose.yaml); what was current becomes :previous (not when it is the same
# image). If the backend does not answer /health over HTTPS, then stay up without restarting for the settle time, the
# release fails and current and previous are put back as they were. A rollback swaps the two, so it can be undone.
# /health answers once the web server is up, before the start's own work (the FoodData Central import) has finished:
# a failure there later than the settle time is not caught here (K-908: readiness in /health).
set -euo pipefail
home=${KEEL_HOME:-/opt/keel}
etc=${KEEL_ETC:-/etc}
kc="$home/deploy/kc"
wait_seconds=${KEEL_RELEASE_WAIT:-300} # the first start imports FoodData Central (minutes); later ones take seconds
settle_seconds=${KEEL_RELEASE_SETTLE:-30}
poll_seconds=${KEEL_RELEASE_POLL:-5}
domain=$(sed -nE "s/^KEEL_DOMAIN=['\"]?([a-z0-9.-]+)['\"]?$/\1/p" "$home/.env")
[[ -n $domain ]] || { echo "no KEEL_DOMAIN in $home/.env" >&2; exit 1; }

id_of() { docker image inspect -f '{{.Id}}' "$1" 2>/dev/null || true; }

answers() { curl -fsS --max-time 5 "https://$domain/health" >/dev/null 2>&1; }

healthy() {
  local tries=$((wait_seconds / (poll_seconds > 0 ? poll_seconds : 1)))
  until answers; do
    ((tries-- > 0)) || return 1
    sleep "$poll_seconds"
  done
  local before after
  before=$(docker inspect -f '{{.State.Status}} {{.RestartCount}}' keel-backend-1)
  sleep "$settle_seconds"
  after=$(docker inspect -f '{{.State.Status}} {{.RestartCount}}' keel-backend-1)
  [[ $before == "running "* && $after == "$before" ]] && answers
}

# A file of deploy/ that lives outside the compose project: copied when it changed (it is root's, hence sudo).
host_file() {
  local from="$home/deploy/$1" to="$etc/$2"
  cmp -s "$from" "$to" 2>/dev/null && return 1
  sudo install -m 644 "$from" "$to"
}

apply_host_files() {
  local units=0
  host_file keel-backup.service systemd/system/keel-backup.service && units=1
  host_file keel-backup.timer systemd/system/keel-backup.timer && units=1
  if ((units)); then sudo systemctl daemon-reload; sudo systemctl enable --now keel-backup.timer; fi
  if host_file journald-keel.conf systemd/journald.conf.d/zz-keel.conf; then sudo systemctl restart systemd-journald; fi
}

# Caddy reads its file through a bind mount of a file deploy.sh replaced: recreate it when the file changed.
apply_caddyfile() {
  local applied="$home/.caddyfile-applied" now
  now=$(cksum < "$home/deploy/Caddyfile")
  [[ -f $applied && $(cat "$applied") == "$now" ]] && return 0
  "$kc" up -d --force-recreate --no-deps caddy
  echo "$now" > "$applied"
}

# Disk: only current and previous are kept.
prune() {
  local keep_current keep_previous tag
  keep_current=$(id_of keel-backend:current)
  keep_previous=$(id_of keel-backend:previous)
  for tag in $(docker images --format '{{.Repository}}:{{.Tag}}' keel-backend); do
    [[ $tag == keel-backend:current || $tag == keel-backend:previous ]] && continue
    local id; id=$(id_of "$tag")
    [[ $id == "$keep_current" || $id == "$keep_previous" ]] && continue
    docker rmi "$tag" >/dev/null
  done
  docker image prune -f >/dev/null
  docker builder prune -f --filter until=168h >/dev/null
}

current=$(id_of keel-backend:current)
previous=$(id_of keel-backend:previous)

if [[ ${1:-} == --rollback ]]; then
  [[ -n $previous ]] || { echo "nothing to roll back to" >&2; exit 1; }
  docker tag "$previous" keel-backend:current
  docker tag "$current" keel-backend:previous
  "$kc" up -d
  if healthy; then
    swap="$home/release-current.swap"
    cp "$home/release-previous" "$swap" 2>/dev/null || : > "$swap"
    cp "$home/release-current" "$home/release-previous" 2>/dev/null || true
    mv "$swap" "$home/release-current"
    echo "rolled back"
    exit 0
  fi
  echo "the rolled-back image did not answer /health" >&2
  exit 1
fi

image=${1:?usage: release.sh <image> | --rollback}
new=$(id_of "$image")
[[ -n $new ]] || { echo "no image $image" >&2; exit 1; }
if [[ -n $current && $current != "$new" ]]; then
  docker tag "$current" keel-backend:previous
fi
docker tag "$new" keel-backend:current
apply_host_files || true
"$kc" up -d --remove-orphans
apply_caddyfile
if healthy; then
  # What runs, by name, for the next deploy (ci-deploy.sh released: an older commit is not put over a newer one).
  if [[ -n $current && $current != "$new" && -f $home/release-current ]]; then cp "$home/release-current" "$home/release-previous"; fi
  echo "$image" > "$home/release-current"
  echo "released $image"
  prune
  exit 0
fi

echo "$image did not answer /health and stay up; putting back what was there" >&2
if [[ -n $current ]]; then docker tag "$current" keel-backend:current; else docker rmi keel-backend:current >/dev/null; fi
if [[ -n $previous ]]; then docker tag "$previous" keel-backend:previous; elif [[ -n $current ]]; then docker rmi keel-backend:previous >/dev/null; fi
[[ -n $current ]] && "$kc" up -d
exit 1
