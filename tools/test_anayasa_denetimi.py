"""The constitution audit's command lists every scan (K-804, ADR-061).

tools/anayasa-denetimi.sh runs the inventory test, the app's constitution suites by name, and the server's architecture
tests. CI runs each of them in its own job; this test keeps the command whole: every suite it names exists, and every app
test that reads the forbidden phrases or the source scanners is named, so a new scan can't be left out of the audit.
"""
import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "tools/anayasa-denetimi.sh"
TESTS = ROOT / "apps/mobile/src/__tests__"
# What a constitution scan reads: the phrase lists (U4, U6, person names) or the source scanners (K2).
SCAN_MARKS = re.compile(r"forbidden-phrases\.json|share-forbidden\.json|support/sourceScan")


def listed_suites(script_text):
    """The names in the script's MOBILE_SUITES=( … ) array."""
    m = re.search(r"^MOBILE_SUITES=\(\s*(.*?)\s*\)", script_text, re.M | re.S)
    if m is None:
        raise ValueError("no MOBILE_SUITES array")
    return [name for name in re.split(r"\s+", m.group(1)) if name and not name.startswith("#")]


def scanning_tests(directory=TESTS):
    return sorted(f.name for f in directory.glob("*.test.ts*") if SCAN_MARKS.search(f.read_text(encoding="utf-8")))


class ReadingTheScript(unittest.TestCase):
    def test_reads_the_array(self):
        self.assertEqual(listed_suites("x=1\nMOBILE_SUITES=(\n  a.test.ts\n  b.test.tsx\n)\nrun\n"), ["a.test.ts", "b.test.tsx"])

    def test_no_array_is_an_error_not_an_empty_list(self):
        with self.assertRaises(ValueError):
            listed_suites("echo nothing\n")


class TheCommandIsWhole(unittest.TestCase):
    def setUp(self):
        self.text = SCRIPT.read_text(encoding="utf-8")
        self.suites = listed_suites(self.text)

    def test_every_listed_suite_exists(self):
        for name in self.suites:
            with self.subTest(suite=name):
                self.assertTrue((TESTS / name).is_file(), name)

    def test_every_scan_is_listed(self):
        found = scanning_tests()
        self.assertGreater(len(found), 3, "the marks find the scans")
        self.assertEqual(sorted(set(found) - set(self.suites)), [])

    def test_the_other_parts_run(self):
        self.assertIn("python3 tools/test_veri_envanteri.py", self.text)
        self.assertIn("--tests 'app.keel.architecture.*'", self.text)
        self.assertIn("set -euo pipefail", self.text)


if __name__ == "__main__":
    unittest.main()
