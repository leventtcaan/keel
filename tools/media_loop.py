"""A move's loop clip from its nine drawn frames (K-1219, ADR-091 Ek 6).

    python3 tools/media_loop.py <grid.png> <out.mp4>

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


def side_of(png: pathlib.Path) -> int:
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", str(png)],
                         check=True, capture_output=True, text=True).stdout.strip()
    width, height = (int(v) for v in out.split(","))
    if width != height:
        raise SystemExit(f"{png.name}: the grid is {width} x {height}, not square")
    return width


def build(grid_png: pathlib.Path, out: pathlib.Path, p: dict = PARAMS) -> None:
    n = p["grid"] ** 2
    with tempfile.TemporaryDirectory() as work:
        frames = []
        for i, (x, y, size) in enumerate(cells(side_of(grid_png), p["grid"]), 1):
            frame = pathlib.Path(work) / f"f{i}.png"
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(grid_png), "-vf",
                            f"crop={size}:{size}:{x}:{y},scale={p['size_px']}:{p['size_px']}:flags=lanczos", str(frame)], check=True)
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


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2
    build(pathlib.Path(argv[0]), pathlib.Path(argv[1]))
    print(f"saved {argv[1]} ({pathlib.Path(argv[1]).stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
