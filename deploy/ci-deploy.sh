#!/usr/bin/env bash
# What the CI deploy key may do on the VPS, and nothing else (K-902, ADR-066). Installed root-owned as
# /usr/local/lib/keel/ci-deploy (authorize-ci.sh; release.sh keeps it in step) — the key cannot change it — and named in
# keel's authorized_keys as `restrict,command="/usr/local/lib/keel/ci-deploy" <key>`; the request is SSH_ORIGINAL_COMMAND.
#   released         the commit in service (nothing before the first release)
#   deploy <commit>  `docker save | gzip` of keel-backend:<commit> on stdin. The server itself fetches the public repository,
#                    requires <commit> on main and not older than what runs, takes deploy/ from that commit (never from
#                    the client), loads the image only if it carries exactly that one tag, and releases it (release.sh).
# What a stolen key can still do: put a forged image in service — it would read .env and the database; not the host.
set -euo pipefail
home=${KEEL_HOME:-/opt/keel}
repository=${KEEL_REPOSITORY:-https://github.com/leventtcaan/keel.git}
refuse() { echo "refused: $*" >&2; exit 2; }
commit_re='^[0-9a-f]{40}$'

running() {
  [[ -f $home/release-current ]] || return 0
  local name; name=$(sed -E 's/^keel-backend://' "$home/release-current")
  [[ $name =~ $commit_re ]] || refuse "what runs is not a commit: $name"
  echo "$name"
}

read -r verb commit rest <<<"${SSH_ORIGINAL_COMMAND:-}" || true
case ${verb:-} in
  released)
    [[ -z ${commit:-} ]] || refuse "released takes nothing"
    running
    exit 0
    ;;
  deploy)
    [[ ${commit:-} =~ $commit_re && -z ${rest:-} ]] || refuse "deploy takes one full commit id"
    ;;
  *) refuse "unknown command" ;;
esac

# main, as the repository has it now — fetched by the server, not told by the client.
source="$home/source.git"
[[ -d $source ]] || git init -q --bare "$source"
git -C "$source" fetch -q --no-tags "$repository" +refs/heads/main:refs/heads/main
git -C "$source" cat-file -e "$commit^{commit}" 2>/dev/null || refuse "$commit is not in the repository"
git -C "$source" merge-base --is-ancestor "$commit" main || refuse "$commit is not on main"
now=$(running)
if [[ -n $now ]]; then
  git -C "$source" merge-base --is-ancestor "$now" "$commit" || refuse "$commit is not newer than the running $now"
fi

# The image: exactly one, tagged keel-backend:<commit> and nothing else (a second tag could repoint previous or current).
image="$home/.incoming-image.tar"
trap 'rm -f "$image"; rm -rf "$home/.deploy-incoming"' EXIT
gunzip > "$image"
tar -xOf "$image" manifest.json | python3 -c '
import json, sys
manifest = json.load(sys.stdin)
sys.exit(0 if len(manifest) == 1 and manifest[0].get("RepoTags") == ["keel-backend:" + sys.argv[1]] else 1)' "$commit" \
  || refuse "the image is not keel-backend:$commit alone"

docker load -q -i "$image"

# deploy/ of that commit, from the server's own copy of main.
rm -rf "$home/.deploy-incoming"
mkdir "$home/.deploy-incoming"
git -C "$source" archive --format=tar "$commit" deploy | tar -x -C "$home/.deploy-incoming"
rm -rf "$home/deploy.old"
if [[ -d $home/deploy ]]; then mv "$home/deploy" "$home/deploy.old"; fi
mv "$home/.deploy-incoming/deploy" "$home/deploy"
rm -rf "$home/deploy.old"

"$home/deploy/release.sh" "keel-backend:$commit"
