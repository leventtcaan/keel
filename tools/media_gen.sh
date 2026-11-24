#!/usr/bin/env bash
# Generate one move's form image (K-1219, ADR-091 #4): fill the standard prompt (tools/media_prompt.py), ask the image
# model through the Codex CLI, shrink the PNG and save it as apps/mobile/assets/exercises/<id>/form.webp.
#
#   tools/media_gen.sh <exercise_id>            # ~2 min, one generation of the image quota
#   tools/media_gen.sh <exercise_id> --convert-only <raw.png>   # only the shrinking step (no generation)
#
# Size: MEDIA_BUDGET_BYTES (default 150000). Shrinking: `sips` (macOS, resizes to fit 1080 x 1350) then `cwebp -size`
# (libwebp, aims 5% under the budget). sips cannot write WebP; with no cwebp the result is a resized
# PNG, saved as form.png, with a warning if it is over budget. The model is gpt-6-luna; never gpt-6-astra.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CODEX="${CODEX_BIN:-/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex}"
MODEL="${MEDIA_MODEL:-gpt-6-luna}"
BUDGET="${MEDIA_BUDGET_BYTES:-150000}"

id="${1:?usage: tools/media_gen.sh <exercise_id> [--convert-only <raw.png>]}"
if [[ "$MODEL" == *astra* ]]; then echo "refusing model $MODEL" >&2; exit 2; fi
out_dir="$ROOT/apps/mobile/assets/exercises/$id"

shrink() { # <raw.png>
  local raw="$1" work; work="$(mktemp -d)"
  sips -Z 1350 "$raw" --out "$work/fit.png" >/dev/null
  mkdir -p "$out_dir"
  if command -v cwebp >/dev/null 2>&1; then
    cwebp -quiet -m 6 -size "$(( BUDGET * 95 / 100 ))" "$work/fit.png" -o "$out_dir/form.webp"
    rm -f "$out_dir/form.png"; result="$out_dir/form.webp"
  else
    cp "$work/fit.png" "$out_dir/form.png"; result="$out_dir/form.png"
  fi
  local bytes; bytes="$(stat -f %z "$result")"
  echo "saved $result ($bytes bytes, budget $BUDGET)"
  if (( bytes > BUDGET )); then echo "WARNING: over the size budget" >&2; fi
}

if [[ "${2:-}" == "--convert-only" ]]; then shrink "${3:?raw png}"; exit 0; fi

prompt="$(python3 "$ROOT/tools/media_prompt.py" "$id")"
scratch="$(mktemp -d)"
cd "$scratch"
"$CODEX" exec -m "$MODEL" --skip-git-repo-check --dangerously-bypass-approvals-and-sandbox \
  "$prompt

Generate this image with your image generation tool. Copy the generated PNG into the current directory as ${id}_raw.png with a plain cp (byte for byte: do not crop, resize or re-encode it) and print its absolute path." >"$scratch/codex.log" 2>&1 || { tail -20 "$scratch/codex.log" >&2; exit 1; }
[[ -f "$scratch/${id}_raw.png" ]] || { echo "no ${id}_raw.png produced; log: $scratch/codex.log" >&2; exit 1; }
echo "raw image: $scratch/${id}_raw.png"
shrink "$scratch/${id}_raw.png"
