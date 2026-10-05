#!/usr/bin/env bash
# What the CI deploy key may do on the VPS, and nothing else (K-902, ADR-066): its line in keel's authorized_keys is
# `restrict,command="/opt/keel/deploy/ci-deploy.sh" <key>`, so sshd runs this whatever the client asked; the request is
# in SSH_ORIGINAL_COMMAND. Three commands:
#   released          the commit in service (empty before the first release)
#   files <commit>    deploy/ of that commit, a tar on stdin, replaces /opt/keel/deploy
#   image <commit>    the image keel-backend:<commit>, `docker save | gzip` on stdin, is loaded and released (release.sh)
set -euo pipefail
home=${KEEL_HOME:-/opt/keel}
refuse() { echo "refused: $*" >&2; exit 2; }

read -r verb commit rest <<<"${SSH_ORIGINAL_COMMAND:-}" || true
case ${verb:-} in
  released)
    [[ -z ${commit:-} ]] || refuse "released takes nothing"
    if [[ -f $home/release-current ]]; then sed -E 's/^keel-backend://' "$home/release-current"; fi
    exit 0
    ;;
  files | image)
    [[ ${commit:-} =~ ^[0-9a-f]{40}$ && -z ${rest:-} ]] || refuse "$verb takes one full commit id"
    ;;
  *) refuse "unknown command" ;;
esac

if [[ $verb == files ]]; then
  incoming="$home/.deploy-incoming"
  rm -rf "$incoming"
  mkdir "$incoming"
  trap 'rm -rf "$incoming"' EXIT
  tar -x --no-same-owner --no-same-permissions -C "$incoming"
  [[ $(ls -A "$incoming") == deploy && -d $incoming/deploy && ! -L $incoming/deploy ]] || refuse "the tar holds more than deploy/"
  chmod -R go-w "$incoming/deploy"
  rm -rf "$home/deploy.old"
  [[ -d $home/deploy ]] && mv "$home/deploy" "$home/deploy.old"
  mv "$incoming/deploy" "$home/deploy"
  rm -rf "$home/deploy.old"
  echo "deploy/ of $commit in place"
  exit 0
fi

gunzip | docker load -q
docker image inspect "keel-backend:$commit" >/dev/null || refuse "the image is not keel-backend:$commit"
exec "$home/deploy/release.sh" "keel-backend:$commit"
