"""A move's loop clip from its nine drawn frames (K-1219, ADR-091 Ek 6).

    python3 tools/media_loop.py <grid.png> <out.mp4>
    python3 tools/media_loop.py --map      # rewrites apps/mobile/src/train/formLoops.ts from the clips on disk

The grid is one square image of 3 x 3 frames in reading order (tools/media_loop.sh asks the image model for it). The clip
plays frames 1 to 9 and back to 1, holding at the start and at the end, each step crossfaded, silent, H.264 in MP4 so the
phone plays it natively. Timings and size: data/exercises/media/loop.json. Needs ffmpeg; standard library otherwise.
"""
import json
import pathlib
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
PARAMS = json.loads((ROOT / "data" / "exercises" / "media" / "loop.json").read_text(encoding="utf-8"))


def sequence(frames: int) -> list[int]:
    """1..n and back to 1: [1, 2, 3, 2, 1] for three."""
    down = list(range(1, frames + 1))
    return down + down[-2::-1]


def durations(frames: int, p: dict = PARAMS) -> list[float]:
    """How long each entry of the sequence is on screen; the first, the last and the turn are held."""
    seq = sequence(frames)
    held = {0: p["hold_start_s"], len(seq) - 1: p["hold_start_s"], frames - 1: p["hold_end_s"]}
    return [held.get(i, p["step_s"]) for i in range(len(seq))]


def offsets(lengths: list[float], crossfade: float) -> list[float]:
    """When each crossfade starts: xfade k begins once clip k-1 has been on screen for its length less the fade."""
    found, t = [], 0.0
    for length in lengths[:-1]:
        t += length - crossfade
        found.append(round(t, 3))
    return found


def cells(side: int, grid: int) -> list[tuple[int, int, int]]:
    """(x, y, size) of each frame, left to right, top to bottom."""
    size = side // grid
    return [(c * size, r * size, size) for r in range(grid) for c in range(grid)]


def floor(pixels: bytes, width: int, x: int, y: int, size: int, p: dict = PARAMS) -> tuple[int | None, int | None]:
    """The cell-relative floor line: its row (the darkest-filled row of the cell's lower half; None when no row is dark
    across at least floor_min_fraction of the cell) and its left end (None when the line runs to the cell's edge, where
    it cannot tell a frame drawn to one side)."""
    best, best_count = None, int(size * p["floor_min_fraction"]) - 1
    for row in range(size // 2, size):
        start = (y + row) * width + x
        count = sum(1 for v in pixels[start:start + size] if v < p["floor_dark_level"])
        if count > best_count:
            best, best_count = row, count
    if best is None:
        return None, None
    start = (y + best) * width + x
    left = next(i for i, v in enumerate(pixels[start:start + size]) if v < p["floor_dark_level"])
    return best, (left if left > 1 else None)


def shifts(floors: list, limit: int = PARAMS["max_shift_px"]) -> list[int]:
    """How far each frame's floor is from the first frame's (negative: higher); the frame is then moved down by that much
    (up when positive), 0 where a floor is unknown."""
    ref = floors[0]
    if ref is None:
        return [0] * len(floors)
    return [0 if f is None else max(-limit, min(limit, f - ref)) for f in floors]


def gray(png: pathlib.Path) -> bytes:
    return subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(png), "-f", "rawvideo", "-pix_fmt", "gray", "-"],
                          check=True, capture_output=True).stdout


def side_of(png: pathlib.Path) -> int:
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", str(png)],
                         check=True, capture_output=True, text=True).stdout.strip()
    width, height = (int(v) for v in out.split(","))
    if width != height:
        raise SystemExit(f"{png.name}: the grid is {width} x {height}, not square")
    return width


def build(grid_png: pathlib.Path, out: pathlib.Path, p: dict = PARAMS) -> None:
    n = p["grid"] ** 2
    side = side_of(grid_png)
    grid = cells(side, p["grid"])
    pixels = gray(grid_png)
    floors = [floor(pixels, side, x, y, size, p) for x, y, size in grid]
    moves = shifts([f[0] for f in floors], p["max_shift_px"])
    sideways = shifts([f[1] for f in floors], p["max_shift_px"])
    pad = p["max_shift_px"]
    with tempfile.TemporaryDirectory() as work:
        frames = []
        for i, ((x, y, size), dy, dx) in enumerate(zip(grid, moves, sideways), 1):
            frame = pathlib.Path(work) / f"f{i}.png"
            # The cell alone first, then moved on a page-coloured canvas: a frame moved up or down never shows the next cell.
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(grid_png), "-vf",
                            f"crop={size}:{size}:{x}:{y},pad={size + 2 * pad}:{size + 2 * pad}:{pad - dx}:{pad - dy}:color=0xFAF8F3,"
                            f"crop={size}:{size}:{pad}:{pad},scale={p['size_px']}:{p['size_px']}:flags=lanczos", str(frame)], check=True)
            frames.append(frame)
        seq, lengths = sequence(n), durations(n, p)
        cmd = ["ffmpeg", "-loglevel", "error", "-y"]
        for index, length in zip(seq, lengths):
            cmd += ["-loop", "1", "-t", f"{length:.3f}", "-i", str(frames[index - 1])]
        parts, prev = [], "[0:v]"
        for k, offset in enumerate(offsets(lengths, p["crossfade_s"]), 1):
            parts.append(f"{prev}[{k}:v]xfade=transition=fade:duration={p['crossfade_s']}:offset={offset}[v{k}]")
            prev = f"[v{k}]"
        cmd += ["-filter_complex", ";".join(parts) + f";{prev}format=yuv420p[out]", "-map", "[out]", "-r", str(p["fps"]),
                "-c:v", "libx264", "-crf", str(p["crf"]), "-movflags", "+faststart", "-an", str(out)]
        out.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(cmd, check=True)


ASSETS = ROOT / "apps" / "mobile" / "assets"
MAP = ROOT / "apps" / "mobile" / "src" / "train" / "formLoops.ts"
MAP_HEAD = """import type { VideoSource } from 'expo-video';

/**
 * The form loop clips in the app's assets (ADR-091 Ek 6, K-1219): the server names one by its asset path (`Exercise.loop`,
 * only once the clip passed its review), and Metro needs a static `require` for each file, so the paths map to them here.
 * Written by `python3 tools/media_loop.py --map` from the files on disk (form-loops.test.ts keeps the two the same).
 */
const LOOPS: Record<string, VideoSource> = {
"""
MAP_TAIL = """};

/** The clip a path from the server names; nothing when this build has no such file (an older app, a newer catalog). */
export function formLoop(path: string | undefined): VideoSource | undefined {
  return path === undefined ? undefined : LOOPS[path];
}

/** The paths this build has a file for. */
export const formLoopPaths = Object.keys(LOOPS);
"""


def map_source(assets: pathlib.Path = ASSETS) -> str:
    ids = sorted(p.parent.name for p in (assets / "exercises").glob("*/loop.mp4"))
    lines = [f"  'exercises/{i}/loop.mp4': require('../../assets/exercises/{i}/loop.mp4'),\n" for i in ids]
    return MAP_HEAD + "".join(lines) + MAP_TAIL


def main(argv: list[str]) -> int:
    if argv == ["--map"]:
        MAP.write_text(map_source(), encoding="utf-8")
        print(f"wrote {MAP.relative_to(ROOT)}")
        return 0
    if len(argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2
    build(pathlib.Path(argv[0]), pathlib.Path(argv[1]))
    print(f"saved {argv[1]} ({pathlib.Path(argv[1]).stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
