"""Tests for tools/media_prompt.py (K-1219): the form-image prompt is the same every time for a move, every one of the
catalog's moves fills every slot, and the fixed style rules are in every prompt.

Run: python3 tools/test_media_prompt.py
"""
import json
import pathlib
import re
import sys
import unittest

sys.dont_write_bytecode = True  # no __pycache__ in tools/
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import media_prompt  # noqa: E402

STYLE_RULES = ("flat vector", "faceless", "#FAF8F3", "#007684", "1080 x 1350", '"Start"', '"End"', "Anatomically correct")


class Prompts(unittest.TestCase):
    def test_the_same_prompt_every_time(self):
        for exercise_id in ("lat_pulldown", "squat", "romanian_deadlift"):
            self.assertEqual(media_prompt.prompt(exercise_id), media_prompt.prompt(exercise_id))

    def test_every_move_fills_every_slot(self):
        ids = media_prompt.ids()
        self.assertEqual(40, len(ids))
        for exercise_id in ids:
            text = media_prompt.prompt(exercise_id)
            self.assertIsNone(re.search(r"\{\w+\}", text), f"{exercise_id}: a slot was left in the prompt")
            for rule in STYLE_RULES:
                self.assertIn(rule, text, f"{exercise_id}: style rule {rule}")

    def test_the_slots_come_from_the_catalog_and_the_copy(self):
        text = media_prompt.prompt("lat_pulldown")
        copy = json.loads(media_prompt.COPY.read_text(encoding="utf-8"))["exercises"]["lat_pulldown"]
        for cue in media_prompt.CUES:
            self.assertIn(copy[cue], text)
        self.assertIn("lats and biceps", text)
        self.assertIn("thigh pad, grip width, handle", text)
        self.assertIn("Equipment type: cable", text)

    def test_a_move_with_no_setup_says_so(self):
        self.assertIn("no machine setup", media_prompt.prompt("push_up"))

    def test_two_moves_differ(self):
        self.assertNotEqual(media_prompt.prompt("squat"), media_prompt.prompt("hack_squat"))

    def test_the_poses_are_exactly_the_catalog(self):
        poses = json.loads((media_prompt.MEDIA / "poses.json").read_text(encoding="utf-8"))
        self.assertEqual(set(media_prompt.ids()), set(poses))
        for exercise_id, pose in poses.items():
            self.assertEqual(set(media_prompt.POSE_SLOTS), set(pose), exercise_id)

    def test_an_unknown_move_stops(self):
        with self.assertRaises(SystemExit):
            media_prompt.prompt("no_such_move")

    def test_the_template_has_no_slot_the_generator_does_not_know(self):
        wanted = set(re.findall(r"\{(\w+)\}", media_prompt.template()))
        self.assertLessEqual(wanted, set(media_prompt.slots("squat")))


if __name__ == "__main__":
    unittest.main()
