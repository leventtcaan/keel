#!/usr/bin/env bash
# Puts the Open Food Facts Turkey subset (ADR-088; ODbL) in /opt/keel/off/off-tr.jsonl on the VPS, where the backend imports it at start.
# As keel on the VPS: /opt/keel/deploy/fetch-off.sh. The nightly dump (several GB compressed) is streamed through deploy/off_filter.py
# and never written to disk whole; only the small filtered file is kept. It is written aside and moved into place, so the backend
# never sees half a file. The filter prints its counts (lines seen, Turkish products, kept) on stderr; ours is the line count at the end.
set -euo pipefail
dir=/opt/keel/off
mkdir -p "$dir"
cd "$dir"
part=off-tr.jsonl.part
trap 'rm -f "$part"' EXIT
curl -fsSL https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz | gunzip -c | python3 -I /opt/keel/deploy/off_filter.py > "$part"
[[ -s $part ]] || { echo "the filter kept no product: $dir/off-tr.jsonl is left as it was" >&2; exit 1; }
mv "$part" off-tr.jsonl
echo "off-tr.jsonl: $(wc -l < off-tr.jsonl) products, $(wc -c < off-tr.jsonl) bytes"
