/**
 * VoiceOver announcements (K-815, docs/yasal/app-store-beyanlari.md › 3): VoiceOver hears only what it is on, so a line that
 * shows up after a tap — a save that failed, the coach's answer — is announced (`AccessibilityInfo.announceForAccessibility`).
 * A problem's line says itself when it appears and when its words change, not at every redraw; a field's problem too, its
 * hint not. And no screen draws a problem as a plain Text (source scan), so a new screen cannot leave one unheard.
 */
import { render, screen } from '@testing-library/react-native';
import * as fs from 'fs';
import * as path from 'path';
import { AccessibilityInfo } from 'react-native';

import { ProblemText, announce } from '@/components/ProblemText';
import { TextField } from '@/components/TextField';
import { ThemeProvider } from '@/theme/theme';

const said = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
beforeEach(() => said.mockClear());

test('a problem says itself when it appears, and again when its words change — not at every redraw', async () => {
  const view = await render(<ProblemText>{"That set couldn't be saved."}</ProblemText>);
  expect(said.mock.calls).toEqual([["That set couldn't be saved."]]);
  await view.rerender(<ProblemText>{"That set couldn't be saved."}</ProblemText>);
  expect(said).toHaveBeenCalledTimes(1);
  await view.rerender(<ProblemText>{'No connection.'}</ProblemText>);
  expect(said).toHaveBeenLastCalledWith('No connection.');
  expect(screen.getByText('No connection.')).toBeOnTheScreen();
  // Cleared and shown again (the screens clear a problem before trying again): said again.
  await view.rerender(<></>);
  await view.rerender(<ProblemText>{'No connection.'}</ProblemText>);
  expect(said).toHaveBeenCalledTimes(3);
});

test('blank words are not announced', () => {
  announce(' ');
  expect(said).not.toHaveBeenCalled();
  announce('The coach is thinking.');
  expect(said).toHaveBeenCalledWith('The coach is thinking.');
});

test("a field's problem is said; its hint is not", async () => {
  const field = (problem: string | null) => (
    <ThemeProvider scheme="light">
      <TextField label="Weight" value="" onChangeText={() => {}} hint="Morning, after the bathroom." problem={problem} />
    </ThemeProvider>
  );
  const view = await render(field(null));
  expect(said).not.toHaveBeenCalled();
  await view.rerender(field("Couldn't save it on this phone."));
  expect(said.mock.calls).toEqual([["Couldn't save it on this phone."]]);
});

/** Every .tsx under a folder, its subfolders included. */
function screens(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : screens(full);
    return entry.name.endsWith('.tsx') ? [full] : [];
  });
}
/** A problem drawn as a plain Text: its words in a variable named for a problem, or a save failure's own key. */
const PLAIN = /<Text\b[^>]*>\s*\{\s*(?:(?:t\(\s*)?(?:SAID\[\s*)?(?:problem|failed)\b[^}]*|said)\}\s*<\/Text>|<Text\b[^>]*>\s*\{\s*(?:t\(\s*'[\w.]+\.(?:saveFailed|finishFailed|deleteFailed)'|problemOf\()/;

test('no screen draws a problem as a plain Text: it would go unheard', () => {
  const SRC = path.resolve(__dirname, '..');
  const plain = screens(SRC).filter((file) => PLAIN.test(fs.readFileSync(file, 'utf8')));
  expect(plain.map((file) => path.relative(SRC, file))).toEqual([]);
});

test('the scan catches the ways a problem is drawn', () => {
  const caught = (text: string) => PLAIN.test(text);
  expect(caught('{problem !== null && <Text style={[styles.text, { color: color.text }]}>{problem}</Text>}')).toBe(true);
  expect(caught('<Text style={x}>{problem.text}</Text>')).toBe(true);
  expect(caught('<Text style={x}>{t(problem)}</Text>')).toBe(true);
  expect(caught('<Text style={x}>{t(SAID[problem])}</Text>')).toBe(true);
  expect(caught('<Text style={x}>{t(failed)}</Text>')).toBe(true);
  expect(caught("<Text style={x}>{t('projection.view.saveFailed')}</Text>")).toBe(true);
  expect(caught("<Text style={x}>{problemOf('machines')}</Text>")).toBe(true);
  expect(caught('<ProblemText style={x}>{problem}</ProblemText>')).toBe(false);
  expect(caught('<Text style={x}>{said}</Text>')).toBe(true);
  expect(caught("<Text style={x}>{t('weighIn.note')}</Text>")).toBe(false);
  // A card's own line named `said` (the first weeks' risk, a state) is not a problem.
  expect(caught('<Text style={x}>{t(said.risk)}</Text>')).toBe(false);
});
