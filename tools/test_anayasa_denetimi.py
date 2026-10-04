"""The constitution audit's command lists every scan (K-804, ADR-061).

tools/anayasa-denetimi.sh runs the inventory test, the app's constitution suites by name, and the server's architecture
and text tests. CI runs each of them in its own job; this test keeps the command whole:
- the app's suites it names are exactly the ones marked `// constitution-audit` on their first line, and every app test
  that reads the phrase lists or the source scanners carries the mark;
- the server's suites it names are exactly the database-free tests that read the phrase lists, the architecture package
  aside (run whole);
- the lines that run them are there, not commented out, and run the lists as they are.
"""
import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "tools/anayasa-denetimi.sh"
APP_TESTS = ROOT / "apps/mobile/src/__tests__"
SERVER_TESTS = ROOT / "backend/src/test/java/app/keel"
MARK = "// constitution-audit"
# What a constitution scan reads: the phrase lists (U4, U6, person names) or the source scanners (K2).
SCAN_READS = re.compile(r"forbidden-phrases\.json|share-forbidden\.json|support/sourceScan|ForbiddenWords")
DATABASE = re.compile(r"@SpringBootTest|PostgresTestConfiguration")


def array(script_text, name):
    """The words of the script's NAME=( … ) array, as bash reads them: a # starts a comment to the end of the line."""
    m = re.search(rf"^{name}=\((.*?)\)", script_text, re.M | re.S)
    if m is None:
        raise ValueError(f"no {name} array")
    body = "\n".join(line.split("#", 1)[0] for line in m.group(1).splitlines())
    return body.split()


def live_lines(script_text):
    """The script's lines bash runs: comments and blank lines out."""
    return [line.strip() for line in script_text.splitlines() if line.strip() and not line.strip().startswith("#")]


def marked_app_suites(directory=APP_TESTS):
    return sorted(f.name for f in directory.glob("*.test.ts*") if f.read_text(encoding="utf-8").startswith(MARK))


def app_scans(directory=APP_TESTS):
    return sorted(f.name for f in directory.glob("*.test.ts*") if SCAN_READS.search(f.read_text(encoding="utf-8")))


def server_text_scans(directory=SERVER_TESTS):
    found = []
    for f in directory.rglob("*Tests.java"):
        text = f.read_text(encoding="utf-8")
        if f.parent.name != "architecture" and SCAN_READS.search(text) and not DATABASE.search(text):
            found.append(f"app.keel.{f.parent.name}.{f.stem}")
    return sorted(found)


class ReadingTheScript(unittest.TestCase):
    def test_reads_the_array(self):
        self.assertEqual(array("x=1\nMOBILE_SUITES=(\n  a.test.ts\n  b.test.tsx\n)\nrun\n", "MOBILE_SUITES"), ["a.test.ts", "b.test.tsx"])

    def test_a_commented_name_is_not_listed(self):
        self.assertEqual(array("MOBILE_SUITES=(\n  # a.test.ts\n  b.test.ts  # note\n)\n", "MOBILE_SUITES"), ["b.test.ts"])

    def test_no_array_is_an_error_not_an_empty_list(self):
        with self.assertRaises(ValueError):
            array("echo nothing\n", "MOBILE_SUITES")

    def test_a_commented_line_does_not_run(self):
        self.assertEqual(live_lines("set -e\n  # (cd backend && ./gradlew test)\necho ok\n"), ["set -e", "echo ok"])


class TheCommandIsWhole(unittest.TestCase):
    def setUp(self):
        self.text = SCRIPT.read_text(encoding="utf-8")
        self.lines = live_lines(self.text)
        self.app = array(self.text, "MOBILE_SUITES")
        self.server = array(self.text, "SERVER_SUITES")

    def test_the_app_suites_listed_are_the_marked_ones(self):
        self.assertGreater(len(self.app), 5)
        self.assertEqual(sorted(self.app), marked_app_suites())

    def test_every_app_scan_is_marked(self):
        found = app_scans()
        self.assertGreater(len(found), 3, "the reads find the scans")
        self.assertEqual(sorted(set(found) - set(marked_app_suites())), [])

    def test_the_server_suites_listed_are_its_text_scans(self):
        found = server_text_scans()
        self.assertGreater(len(found), 1, "the reads find the scans")
        self.assertEqual(sorted(self.server), found)

    def test_the_lines_run_the_lists(self):
        self.assertIn("set -euo pipefail", self.lines)
        self.assertIn("python3 tools/test_veri_envanteri.py", self.lines)
        self.assertIn('(cd apps/mobile && npx --no-install jest --ci "${MOBILE_SUITES[@]/#/src/__tests__/}")', self.lines)
        self.assertIn('for suite in "${SERVER_SUITES[@]}"; do SERVER_ARGS+=(--tests "$suite"); done', self.lines)
        self.assertIn("(cd backend && ./gradlew test --console=plain --tests 'app.keel.architecture.*' "
                      '"${SERVER_ARGS[@]}")', self.lines)
        self.assertNotRegex(self.text, r"passWithNoTests|\|\|\s*true")


if __name__ == "__main__":
    unittest.main()
