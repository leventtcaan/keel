#!/usr/bin/env bash
# Generate one move's loop clip (K-1219, ADR-091 Ek 6): the move's approved form image goes to the image model as the
# reference with the standard loop prompt (tools/media_prompt.py --loop); the nine-frame grid it draws becomes
# apps/mobile/assets/exercises/<id>/loop.mp4 (tools/media_loop.py). The grid itself is kept outside the repository, in
# MEDIA_GRID_DIR (default ~/Documents/keel-media/loops), for review and for a rebuild without a new generation.
#
#   tools/media_loop.sh <exercise_id>                      # one generation of the image quota, a few minutes
#   tools/media_loop.sh <exercise_id> --from-grid <grid>   # only the clip, from a grid already drawn
#
# The model is gpt-6-luna; never gpt-6-astra. stdin is closed: the CLI otherwise waits for more input when run in the background.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CODEX="${CODEX_BIN:-/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex}"
MODEL="${MEDIA_MODEL:-gpt-6-luna}"
GRIDS="${MEDIA_GRID_DIR:-$HOME/Documents/keel-media/loops}"

id="${1:?usage: tools/media_loop.sh <exercise_id> [--from-grid <grid.png>]}"
if [[ "$MODEL" == *astra* ]]; then echo "refusing model $MODEL" >&2; exit 2; fi
out="$ROOT/apps/mobile/assets/exercises/$id/loop.mp4"

if [[ "${2:-}" == "--from-grid" ]]; then python3 "$ROOT/tools/media_loop.py" "${3:?grid png}" "$out"; exit 0; fi

ref="$ROOT/apps/mobile/assets/exercises/$id/form.webp"
[[ -f "$ref" ]] || { echo "no form image for $id ($ref): the loop is drawn from it" >&2; exit 1; }
prompt="$(python3 "$ROOT/tools/media_prompt.py" --loop "$id")"
scratch="$(mktemp -d)"
sips -s format png "$ref" --out "$scratch/${id}_ref.png" >/dev/null
cd "$scratch"
"$CODEX" exec -m "$MODEL" --skip-git-repo-check --dangerously-bypass-approvals-and-sandbox --image "${id}_ref.png" -- "$prompt

Generate this image with your image generation tool, using ${id}_ref.png as the reference image. Copy the generated PNG into the current directory as ${id}_grid.png with a plain cp (byte for byte: do not crop, resize or re-encode it) and print its absolute path." </dev/null >"$scratch/codex.log" 2>&1 || { tail -20 "$scratch/codex.log" >&2; exit 1; }
[[ -f "$scratch/${id}_grid.png" ]] || { echo "no ${id}_grid.png produced; log: $scratch/codex.log" >&2; exit 1; }
mkdir -p "$GRIDS"
cp "$scratch/${id}_grid.png" "$GRIDS/${id}_grid.png"
echo "grid: $GRIDS/${id}_grid.png"
python3 "$ROOT/tools/media_loop.py" "$GRIDS/${id}_grid.png" "$out"
