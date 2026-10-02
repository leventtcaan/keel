"""Cut and compress a move's demo clip from a raw phone video (K-419, ADR-017).

Levent films each catalog move twice — the first rep and the last rep (RIR ~1) — and checks every clip against
docs/hareket-cekim-kontrol-listesi.md. This script does the mechanical part: cut the rep out of the raw video, drop the
sound, make it portrait, small and quick to start, and write it where the move's YAML says its clip is.

    python3 tools/clip.py cut <raw.mov> <exercise_id> <first|last> --start 12.4 --end 16.1
    python3 tools/clip.py missing

`missing` lists the clips still to film or to check: a file not there, or a move whose review is not a pass.
Only the standard library and ffmpeg (on PATH) are needed.
"""
import argparse
import pathlib
import re
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CATALOG = ROOT / "data" / "exercises"

# docs/hareket-cekim-kontrol-listesi.md › Çekim: portrait, 3-5 s, no sound.
MIN_SECONDS = 3.0
MAX_SECONDS = 5.0
# ADR-017: ~40 moves × 2 clips in ~19 MB on the phone, so ~240 KB a clip; a clip over it is said, not refused.
BUDGET_BYTES = 240_000
# Portrait at 960 px high is sharp on a phone at half screen (two clips side by side); H.264 CRF 28 keeps a 4 s clip
# near the budget. yuv420p plays everywhere; faststart puts the index first so the clip starts at once.
HEIGHT = 960
FPS = 30
CRF = 28

KINDS = {"first": "first_rep", "last": "last_rep"}


def catalog_entry(exercise_id: str, catalog: pathlib.Path = CATALOG) -> dict:
    """The clip paths and the review line of a move's YAML (read line by line: the file is flat, no YAML library)."""
    path = catalog / f"{exercise_id}.yaml"
    if not path.exists():
        raise SystemExit(f"no move '{exercise_id}' in {catalog}")
    entry = {"review": None}
    for line in path.read_text(encoding="utf-8").splitlines():
        match = re.match(r"^\s+(first_rep|last_rep):\s*(\S+)", line)
        if match:
            entry[match.group(1)] = match.group(2)
        match = re.match(r"^review:\s*(.+)$", line)
        if match:
            entry["review"] = match.group(1).strip()
    return entry


def passed(review: str | None) -> bool:
    """A review that passed the checklist: `{date: "…", by: levent, checklist: pass, …}`; `pending` is not one."""
    return review is not None and re.search(r"checklist:\s*pass\b", review) is not None


def cut_command(raw: pathlib.Path, out: pathlib.Path, start: float, end: float) -> list[str]:
    """The ffmpeg call: the rep between start and end (seconds), no sound, portrait at HEIGHT, H.264, faststart."""
    if not MIN_SECONDS <= end - start <= MAX_SECONDS:
        raise SystemExit(f"a clip is {MIN_SECONDS:g}-{MAX_SECONDS:g} s; this one is {end - start:g} s")
    return [
        "ffmpeg", "-y", "-loglevel", "error",
        "-i", str(raw),
        # After -i: cut on the exact frame, not the nearest keyframe (a rep is short, a frame off shows).
        "-ss", f"{start:.3f}", "-to", f"{end:.3f}",
        "-an",
        "-vf", f"scale=-2:{HEIGHT},fps={FPS}",
        "-c:v", "libx264", "-preset", "slow", "-crf", str(CRF), "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        str(out),
    ]


def cut(raw: pathlib.Path, exercise_id: str, kind: str, start: float, end: float, catalog: pathlib.Path = CATALOG) -> pathlib.Path:
    entry = catalog_entry(exercise_id, catalog)
    out = catalog / entry[KINDS[kind]]
    out.parent.mkdir(parents=True, exist_ok=True)
    if shutil.which("ffmpeg") is None:
        raise SystemExit("ffmpeg is not on PATH")
    subprocess.run(cut_command(raw, out, start, end), check=True)
    size = out.stat().st_size
    note = "" if size <= BUDGET_BYTES else f" — over the {BUDGET_BYTES // 1000} KB budget, check the cut"
    print(f"{out.relative_to(ROOT) if out.is_relative_to(ROOT) else out}: {size // 1000} KB{note}")
    print("Check it against docs/hareket-cekim-kontrol-listesi.md, then write its review in the move's YAML.")
    return out


def missing(catalog: pathlib.Path = CATALOG) -> list[str]:
    """Each move's clips still to film (no file) and the moves still to check (review not a pass), one line each."""
    lines = []
    for path in sorted(catalog.glob("*.yaml")):
        exercise_id = path.stem
        entry = catalog_entry(exercise_id, catalog)
        absent = [kind for kind, key in KINDS.items() if key not in entry or not (catalog / entry[key]).exists()]
        if absent or not passed(entry["review"]):
            to_film = f"film: {', '.join(absent)}" if absent else "filmed"
            lines.append(f"{exercise_id}: {to_film}; review: {'pass' if passed(entry['review']) else 'pending'}")
    return lines


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    commands = parser.add_subparsers(dest="command", required=True)
    one = commands.add_parser("cut", help="cut one clip out of a raw video")
    one.add_argument("raw", type=pathlib.Path)
    one.add_argument("exercise")
    one.add_argument("kind", choices=sorted(KINDS))
    one.add_argument("--start", type=float, required=True)
    one.add_argument("--end", type=float, required=True)
    commands.add_parser("missing", help="list the clips still to film or check")
    args = parser.parse_args(argv)
    if args.command == "cut":
        cut(args.raw, args.exercise, args.kind, args.start, args.end)
        return 0
    lines = missing()
    print("\n".join(lines) if lines else "every move has both clips, checked")
    print(f"{len(lines)} of {len(list(CATALOG.glob('*.yaml')))} moves left")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
