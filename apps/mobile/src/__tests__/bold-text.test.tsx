/**
 * iOS Bold Text must not cut the end off a label (K-910, device tour of 7 Oct: "Log a mea", "Your recipe:", "This week's cal").
 *
 * Why it happens, in the installed React Native (0.86.3), read from its source:
 * - React Native never lets Bold Text into layout: the only code that knows of it reports the switch to JS
 *   (React/CoreModules/RCTAccessibilityManager.mm); the text layout manager (ReactCommon/…/textlayoutmanager) has no trace of it.
 * - A paragraph's view is exactly the size layout measured, rounded up to a pixel (RCTTextLayoutManager.mm › _measureTextStorage;
 *   RCTParagraphComponentView.mm › drawRect draws into that content frame), and a line that does not fit is clipped, not wrapped
 *   (NSLineBreakByClipping when there is no numberOfLines). Whatever is drawn wider than it was measured is cut.
 * - So only a text box that is exactly as wide as its text can lose letters: one inside a column (it stretches to the column) never
 *   does, one that hugs its text (a small button, a chip, a label in a row) does. That is the pattern of the device screenshot: the
 *   "Left today" and "Today's meals" cards are intact, the buttons and the call's eyebrow are not.
 * - That iOS draws Bold Text wider than it measures it is not in this source: [doğrulanmadı] here, the device check (K-984).
 * The fix gives every hugging label room: FitText, and growing boxes in rows. These tests keep both: the cause pinned to the version
 * it was read in (an upgrade must read it again), and the room on each shared component.
 */
import { render, screen } from '@testing-library/react-native';
import * as fs from 'fs';
import * as path from 'path';
import type { ReactElement } from 'react';
import { Text } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { DecisionBlock } from '@/components/DecisionBlock';
import { FitText } from '@/components/FitText';
import { OptionCard } from '@/components/OptionCard';
import { SettingsRow } from '@/settings/SettingsRow';
import { ThemeProvider } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

function renderIt(ui: ReactElement) {
  return render(<ThemeProvider scheme="light">{ui}</ThemeProvider>);
}

const reactNative = path.dirname(require.resolve('react-native/package.json'));
const read = (...parts: string[]) => fs.readFileSync(path.join(reactNative, ...parts), 'utf8');
const textLayout = path.join('ReactCommon', 'react', 'renderer', 'textlayoutmanager', 'platform', 'ios', 'react', 'renderer', 'textlayoutmanager');

describe('the cause, in the installed React Native', () => {
  test('the source it was read in is the one installed', () => {
    const installed = (JSON.parse(read('package.json')) as { version: string }).version;
    const declared = (JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    }).dependencies['react-native'];
    expect(installed).toBe('0.86.3');
    expect(declared).toBe(installed);
  });

  test('Bold Text only reaches JS as a switch, never the text layout', () => {
    expect(read('React', 'CoreModules', 'RCTAccessibilityManager.mm')).toContain('UIAccessibilityIsBoldTextEnabled');
    for (const file of fs.readdirSync(path.join(reactNative, textLayout))) {
      expect(read(textLayout, file)).not.toMatch(/bold ?text|UIAccessibilityIsBold|legibility/i);
    }
  });

  test('a line that does not fit its box is clipped, and the box is the measured text rounded up', () => {
    const manager = read(textLayout, 'RCTTextLayoutManager.mm');
    expect(manager).toMatch(/maximumNumberOfLines > 0\s*\?[^;]*:\s*NSLineBreakByClipping/);
    expect(manager).toContain('ceil(size.width * layoutContext.pointScaleFactor)');
    expect(read('React', 'Fabric', 'Mounting', 'ComponentViews', 'Text', 'RCTParagraphComponentView.mm')).toContain(
      '_layoutMetrics.getContentFrame()',
    );
  });
});

describe('FitText', () => {
  test('shows the text once, stretched to its box, and sizes the box by a heavier hidden copy', async () => {
    await renderIt(<FitText style={{ fontSize: 16 }}>Log a meal</FitText>);
    expect(screen.getAllByText('Log a meal')).toHaveLength(1);
    const copies = screen.getAllByText('Log a meal', { includeHiddenElements: true });
    expect(copies).toHaveLength(2);
    const [shown, sizer] = copies;
    expect(shown).toHaveStyle({ fontSize: 16, alignSelf: 'stretch' });
    expect(sizer).toHaveStyle({ fontSize: 16, fontWeight: tokens.weight.black, height: 0, opacity: 0 });
    expect(sizer).toHaveProp('accessibilityElementsHidden', true);
    expect(sizer).toHaveProp('importantForAccessibility', 'no-hide-descendants');
  });

  test('the hidden copy keeps the font of the shown one, so the box is the width of that text', async () => {
    await renderIt(<FitText style={{ fontFamily: tokens.font.display, fontSize: 30, textTransform: 'uppercase' }}>Hello</FitText>);
    const [, sizer] = screen.getAllByText('Hello', { includeHiddenElements: true });
    expect(sizer).toHaveStyle({ fontFamily: tokens.font.display, fontSize: 30, textTransform: 'uppercase' });
  });
});

describe('a control that hugs its label gives the label room', () => {
  test.each([
    ['md', 'Log a meal'],
    ['sm', 'Log from a photo'],
    ['touch', 'Your recipes'],
  ] as const)('a %s Button: label inside FitText, named for a screen reader by the label itself', async (size, label) => {
    await renderIt(<Button label={label} size={size} onPress={() => {}} />);
    expect(screen.getAllByText(label, { includeHiddenElements: true })).toHaveLength(2);
    expect(screen.getByRole('button', { name: label })).toBeOnTheScreen();
    expect(screen.getByText(label)).toHaveStyle({ alignSelf: 'stretch', textAlign: 'center' });
  });

  test('a Button keeps the name it was given', async () => {
    await renderIt(<Button label="Withdraw" accessibilityLabel="Withdraw Health data" onPress={() => {}} />);
    expect(screen.getByRole('button', { name: 'Withdraw Health data' })).toBeOnTheScreen();
  });

  test('a Chip: label inside FitText, named by the label, touch size kept', async () => {
    await renderIt(<Chip label="Easy" touch onPress={() => {}} />);
    expect(screen.getAllByText('Easy', { includeHiddenElements: true })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Easy' })).toHaveStyle({ minHeight: tokens.size.touch, minWidth: tokens.size.touch });
  });

  test('the decision eyebrow beside a mark takes the room the mark leaves', async () => {
    await renderIt(<DecisionBlock eyebrow="This week's call" aside={<Text>go</Text>} title="Eat a little more" />);
    expect(screen.getByText("This week's call")).toHaveStyle({ flexGrow: 1, flexShrink: 1 });
  });

  test('an OptionCard title takes the room the mark leaves, its tag is a FitText', async () => {
    await renderIt(<OptionCard title="Add a day" tag="Recommended" selected={false} onPress={() => {}} />);
    expect(screen.getByText('Add a day')).toHaveStyle({ flexGrow: 1, flexShrink: 1 });
    expect(screen.getAllByText('Recommended', { includeHiddenElements: true })).toHaveLength(2);
  });

  test('a Settings row: its label and its value both grow, so neither is as wide as its text', async () => {
    await renderIt(<SettingsRow label="Training days" value="Mon, Wed, Fri" onPress={() => {}} />);
    expect(screen.getByText('Training days')).toHaveStyle({ flexGrow: 1, flexShrink: 1 });
    expect(screen.getByText('Mon, Wed, Fri')).toHaveStyle({ flexGrow: 1, flexShrink: 1 });
  });
});
