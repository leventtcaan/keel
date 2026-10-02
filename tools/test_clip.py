"""Tests for tools/clip.py (K-419): the length a clip may be, the ffmpeg call, the catalog's clip paths and review, the
list of what is left. With ffmpeg on PATH, a real cut of a generated portrait video too (no sound, portrait, the length).

Run: python3 tools/test_clip.py
"""
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile
import unittest

sys.dont_write_bytecode = True  # no __pycache__ in tools/
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import clip  # noqa: E402

YAML = """id: {id}
kind: compound
clips:
  first_rep: clips/{id}/first-rep.mp4
  last_rep: clips/{id}/last-rep.mp4
review: {review}
"""


def catalog(tmp: pathlib.Path, moves: dict[str, str]) -> pathlib.Path:
    for exercise_id, review in moves.items():
        (tmp / f"{exercise_id}.yaml").write_text(YAML.format(id=exercise_id, review=review), encoding="utf-8")
    return tmp


class Length(unittest.TestCase):
    def test_three_to_five_seconds(self):
        raw, out = pathlib.Path("raw.mov"), pathlib.Path("out.mp4")
        self.assertIn("-an", clip.cut_command(raw, out, 10.0, 13.0))
        clip.cut_command(raw, out, 10.0, 15.0)
        with self.assertRaises(SystemExit):
            clip.cut_command(raw, out, 10.0, 12.9)
        with self.assertRaises(SystemExit):
            clip.cut_command(raw, out, 10.0, 15.1)

    def test_the_call_cuts_after_the_input_drops_the_sound_and_starts_fast(self):
        command = clip.cut_command(pathlib.Path("raw.mov"), pathlib.Path("out.mp4"), 1.5, 5.0)
        self.assertLess(command.index("-i"), command.index("-ss"))
        self.assertEqual(command[command.index("-ss") + 1 : command.index("-to") + 2], ["1.500", "-to", "5.000"])
        self.assertIn("+faststart", command)
        self.assertEqual(command[-1], "out.mp4")


class Catalog(unittest.TestCase):
    def test_clip_paths_and_review_from_the_yaml(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = catalog(pathlib.Path(tmp), {"bench_press": "pending"})
            entry = clip.catalog_entry("bench_press", root)
            self.assertEqual(entry["first_rep"], "clips/bench_press/first-rep.mp4")
            self.assertEqual(entry["last_rep"], "clips/bench_press/last-rep.mp4")
            self.assertFalse(clip.passed(entry["review"]))
            with self.assertRaises(SystemExit):
                clip.catalog_entry("zercher_squat", root)

    def test_a_pass_is_the_checklist_saying_pass(self):
        self.assertTrue(clip.passed('{date: "2026-10-05", by: levent, checklist: pass, notes: "ok"}'))
        self.assertFalse(clip.passed('{date: "2026-10-05", by: levent, checklist: fail}'))
        self.assertFalse(clip.passed("pending"))

    def test_missing_lists_what_is_left_to_film_or_check(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = catalog(
                pathlib.Path(tmp), {"bench_press": "pending", "squat": "pending", "row": '{checklist: pass}', "dip": "pending"}
            )
            for exercise_id in ("squat", "row", "dip"):
                for kind in ("first", "last"):
                    path = root / "clips" / exercise_id / f"{kind}-rep.mp4"
                    path.parent.mkdir(parents=True, exist_ok=True)
                    path.write_bytes(b"x")
            (root / "clips" / "squat" / "last-rep.mp4").unlink()
            self.assertEqual(
                clip.missing(root),
                ["bench_press: film: first, last; review: pending", "dip: filmed; review: pending", "squat: film: last; review: pending"],
            )


@unittest.skipIf(shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None, "ffmpeg not on PATH")
class RealCut(unittest.TestCase):
    def test_a_portrait_clip_without_sound_of_the_length_asked(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = catalog(pathlib.Path(tmp), {"bench_press": "pending"})
            raw = root / "raw.mov"
            subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=1080x1920:rate=30:duration=8",
                 "-f", "lavfi", "-i", "sine=duration=8", "-shortest", str(raw)],
                check=True,
            )
            out = clip.cut(raw, "bench_press", "last", 2.0, 6.0, catalog=root)
            self.assertEqual(out, root / "clips" / "bench_press" / "last-rep.mp4")
            probe = json.loads(
                subprocess.run(
                    ["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(out)],
                    check=True, capture_output=True, text=True,
                ).stdout
            )
            kinds = [s["codec_type"] for s in probe["streams"]]
            self.assertEqual(kinds, ["video"])
            video = probe["streams"][0]
            self.assertEqual(int(video["height"]), clip.HEIGHT)
            self.assertLess(int(video["width"]), int(video["height"]))
            self.assertAlmostEqual(float(probe["format"]["duration"]), 4.0, delta=0.1)


if __name__ == "__main__":
    unittest.main(verbosity=1)
