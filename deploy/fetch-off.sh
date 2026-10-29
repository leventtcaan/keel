#!/usr/bin/env bash
# Puts the Open Food Facts subsets (ADR-088, ADR-090 #1; ODbL) in /opt/keel/off/off-<region>.jsonl on the VPS (off-tr.jsonl for Turkey,
# off-us.jsonl for the United States), where the backend imports each at start when it changed.
# As keel on the VPS: /opt/keel/deploy/fetch-off.sh [REGION ...]   (default: TR US; REGIONS in the environment does the same).
# The nightly dump (13 GB compressed) is streamed through deploy/off_filter.py once, for every region, and never written to disk
# whole; only the small filtered files are kept. Each is written in a work directory and moved into place, so the backend never sees
# half a file; a region whose filter kept no product is left as it was. The filter prints its counts on stderr.
# The dump takes about an hour: run it detached (setsid / systemd-run), a dropped SSH session must not end it (ADR-088 Ek 1).
set -euo pipefail
dir=/opt/keel/off
mkdir -p "$dir"
cd "$dir"
regions=("$@")
[[ ${#regions[@]} -gt 0 ]] || read -r -a regions <<< "${REGIONS:-TR US}"
work=$(mktemp -d "$dir/.work.XXXXXX")
trap 'rm -rf "$work"' EXIT
curl -fsSL https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz | gunzip -c | python3 -I /opt/keel/deploy/off_filter.py "$work" "${regions[@]}"
status=0
for region in "${regions[@]}"; do
  file=off-${region,,}.jsonl
  if [[ -s $work/$file ]]; then
    mv "$work/$file" "$file"
    echo "$file: $(wc -l < "$file") products, $(wc -c < "$file") bytes"
  else
    echo "the filter kept no product for $region: $dir/$file is left as it was" >&2
    status=1
  fi
done
exit "$status"
