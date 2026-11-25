"""Tests for tools/media_loop.py and the loop prompt (K-1219, ADR-091 Ek 6): a loop plays frames 1 to 9 and back to 1,
holds longer at the two ends, every crossfade starts after the frame before it is on screen, the grid is cut into nine
equal squares in reading order, and every move's loop prompt fills every slot and carries the animation rules.

Run: python3 tools/test_media_loop.py
"""
import pathlib
import re
import sys
import unittest

sys.dont_write_bytecode = True  # no __pycache__ in tools/
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import media_loop  # noqa: E402
import media_prompt  # noqa: E402

LOOP_RULES = ("3 x 3 grid", "nine", "IDENTICAL", "No text", "#FAF8F3", "#007684", "faceless", "Anatomically correct",
              "one way only", "Do not\ncopy the reference's arrow", "Start panel in every frame")


class Sequence(unittest.TestCase):
    def test_down_and_back_to_the_first_frame(self):
        self.assertEqual([1, 2, 3, 2, 1], media_loop.sequence(3))
        seq = media_loop.sequence(9)
        self.assertEqual(17, len(seq))
        self.assertEqual((1, 9, 1), (seq[0], seq[8], seq[-1]))

    def test_ends_held_longer_than_the_steps(self):
        p = media_loop.PARAMS
        durations = media_loop.durations(9, p)
        self.assertEqual(p["hold_start_s"], durations[0])
        self.assertEqual(p["hold_start_s"], durations[-1])
        self.assertEqual(p["hold_end_s"], durations[8])
        self.assertTrue(all(d == p["step_s"] for i, d in enumerate(durations) if i not in (0, 8, 16)))
        self.assertGreater(p["hold_start_s"], p["step_s"])

    def test_every_crossfade_starts_after_the_one_before_and_inside_the_clip(self):
        p = media_loop.PARAMS
        offsets = media_loop.offsets(media_loop.durations(9, p), p["crossfade_s"])
        self.assertEqual(16, len(offsets))
        self.assertTrue(all(b - a >= p["step_s"] - p["crossfade_s"] - 1e-9 for a, b in zip(offsets, offsets[1:])))
        self.assertLess(offsets[-1] + p["crossfade_s"], sum(media_loop.durations(9, p)))

    def test_a_step_is_never_shorter_than_its_crossfade(self):
        p = media_loop.PARAMS
        self.assertGreater(p["step_s"], p["crossfade_s"])

    def test_the_grid_is_cut_in_reading_order(self):
        cells = media_loop.cells(1254, 3)
        self.assertEqual(9, len(cells))
        self.assertEqual((0, 0, 418), cells[0])
        self.assertEqual((418, 0, 418), cells[1])
        self.assertEqual((0, 418, 418), cells[3])
        self.assertEqual((836, 836, 418), cells[8])


def picture(side: int, floors: dict, grid: int = 3) -> bytes:
    """An off-white grid image (one byte a pixel) with a dark floor line in each cell: {(row, col): (floor row, left end)}."""
    pixels = bytearray([250]) * (side * side)
    size = side // grid
    for (r, c), (row, left) in floors.items():
        start = (r * size + row) * side + c * size + left
        pixels[start:start + size // 2] = bytes([40]) * (size // 2)
    return bytes(pixels)


class FloorAlignment(unittest.TestCase):
    def test_the_floor_is_the_longest_dark_line_in_the_lower_half_of_a_cell_with_its_left_end(self):
        p = media_loop.PARAMS
        image = picture(300, {(0, 0): (80, 10), (1, 0): (70, 20)})
        self.assertEqual((80, 10), media_loop.floor(image, 300, 0, 0, 100, p))
        self.assertEqual((70, 20), media_loop.floor(image, 300, 0, 100, 100, p))

    def test_a_floor_touching_the_cell_edge_gives_no_left_end(self):
        self.assertEqual((80, None), media_loop.floor(picture(300, {(0, 0): (80, 0)}), 300, 0, 0, 100, media_loop.PARAMS))

    def test_no_clear_floor_is_none(self):
        self.assertEqual((None, None), media_loop.floor(picture(300, {}), 300, 0, 0, 100, media_loop.PARAMS))

    def test_each_frame_moves_so_its_floor_sits_where_the_first_frames_does(self):
        self.assertEqual([0, 0, -11, -25], media_loop.shifts([400, 400, 389, 375]))
        self.assertEqual([0, 0, 0], media_loop.shifts([None, 300, 310]), "no floor in the first frame: nothing moves")
        self.assertEqual([0, 0, -5], media_loop.shifts([300, None, 295]), "a frame with no floor stays put")

    def test_a_shift_never_moves_a_frame_by_more_than_the_padding(self):
        p = media_loop.PARAMS
        self.assertEqual([0, p["max_shift_px"], -p["max_shift_px"]], media_loop.shifts([100, 1000, -1000], p["max_shift_px"]))


class LoopPrompts(unittest.TestCase):
    def test_every_move_fills_every_slot_and_carries_the_rules(self):
        for exercise_id in media_prompt.ids():
            text = media_prompt.prompt(exercise_id, loop=True)
            self.assertIsNone(re.search(r"\{\w+\}", text), f"{exercise_id}: a slot was left in the loop prompt")
            for rule in LOOP_RULES:
                self.assertIn(rule, text, f"{exercise_id}: loop prompt lacks {rule!r}")

    def test_the_loop_prompt_is_not_the_image_prompt(self):
        self.assertNotEqual(media_prompt.prompt("squat"), media_prompt.prompt("squat", loop=True))
        self.assertNotIn("1080 x 1350", media_prompt.prompt("squat", loop=True))


if __name__ == "__main__":
    unittest.main()
