/**
 * iOS Bold Text must not cut the end off a label (K-910, device tour of 7 Oct: "Log a mea", "Your recipe:", "This week's cal").
 *
 * Verified in the installed React Native (0.86.3): it never lets Bold Text into layout (the switch only reaches JS, from
 * RCTAccessibilityManager.mm); a paragraph's view is exactly the measured text rounded up to a pixel
 * (RCTTextLayoutManager.mm, RCTParagraphComponentView.mm) and a line that does not fit is clipped, not wrapped
 * (NSLineBreakByClipping without numberOfLines). So a text box exactly as wide as its text can lose letters; one that
 * stretches to its container cannot.
 * Not in this source, [doğrulanmadı]: that iOS draws Bold Text wider than it measures it. That is the device check (K-984).
 *
 * The fix: with Bold Text on, a label that hugs its text is sized by a hidden heavier copy (FitText); texts in a row grow into
 * the room the row has. Off, and on Android, layout is what it was.
 */
import { act, render, renderHook, screen } from '@testing-library/react-native';
import * as fs from 'fs';
import * as path from 'path';
import type { ReactElement } from 'react';
import { AccessibilityInfo, Text } from 'react-native';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { DecisionBlock } from '@/components/DecisionBlock';
import { FitText } from '@/components/FitText';
import { ListRow } from '@/components/ListGroup';
import { OptionCard } from '@/components/OptionCard';
import { CallCard } from '@/today/CallCard';
import { ThemeProvider } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { useBoldText } from '@/theme/useBoldText';

jest.mock('@/services/ServicesProvider', () => ({
  useAppServices: () => ({ api: {}, report: () => {} }),
  useUnits: () => 'METRIC',
}));

let changed: (on: boolean) => void = () => {};
function boldText(on: boolean) {
  jest.spyOn(AccessibilityInfo, 'isBoldTextEnabled').mockResolvedValue(on);
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((_: string, handler: (on: boolean) => void) => {
    changed = handler;
    return { remove: () => {} };
  }) as never);
}
afterEach(() => jest.restoreAllMocks());

async function renderIt(ui: ReactElement) {
  await render(<ThemeProvider scheme="light">{ui}</ThemeProvider>);
  await act(async () => {});
}

const copies = (text: string) => screen.getAllByText(text, { includeHiddenElements: true });

test('the React Native it was read in is the one installed, and only RCTAccessibilityManager knows Bold Text', () => {
  const reactNative = path.dirname(require.resolve('react-native/package.json'));
  const installed = (JSON.parse(fs.readFileSync(path.join(reactNative, 'package.json'), 'utf8')) as { version: string }).version;
  const declared = (
    JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', '..', 'package.json'), 'utf8')) as { dependencies: Record<string, string> }
  ).dependencies['react-native'];
  expect(installed).toBe('0.86.3');
  expect(declared).toBe(installed);
  const holders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(mm|m|cpp|h)$/.test(entry.name) && fs.readFileSync(full, 'utf8').includes('UIAccessibilityIsBoldTextEnabled')) {
        holders.push(path.relative(reactNative, full));
      }
    }
  };
  walk(path.join(reactNative, 'React'));
  walk(path.join(reactNative, 'ReactCommon'));
  expect(holders).toEqual([path.join('React', 'CoreModules', 'RCTAccessibilityManager.mm')]);
});

describe('useBoldText', () => {
  test('follows the phone: off at start, on when it is turned on, off again', async () => {
    boldText(false);
    const { result } = await renderHook(() => useBoldText());
    await act(async () => {});
    expect(result.current).toBe(false);
    await act(async () => changed(true));
    expect(result.current).toBe(true);
    await act(async () => changed(false));
    expect(result.current).toBe(false);
  });

  test('on at start', async () => {
    boldText(true);
    const { result } = await renderHook(() => useBoldText());
    await act(async () => {});
    expect(result.current).toBe(true);
  });

  test('not readable: as without the setting', async () => {
    jest.spyOn(AccessibilityInfo, 'isBoldTextEnabled').mockRejectedValue(new Error('x'));
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((() => ({ remove: () => {} })) as never);
    const { result } = await renderHook(() => useBoldText());
    await act(async () => {});
    expect(result.current).toBe(false);
  });
});

describe('FitText', () => {
  test('Bold Text off: a plain Text, no hidden copy, no box around it', async () => {
    boldText(false);
    await renderIt(<FitText style={{ fontSize: 16 }}>Log a meal</FitText>);
    expect(copies('Log a meal')).toHaveLength(1);
    expect(screen.getByText('Log a meal')).toHaveStyle({ fontSize: 16 });
    expect(screen.getByText('Log a meal')).not.toHaveStyle({ alignSelf: 'stretch' });
  });

  test('Bold Text on: the shown label stretches to a box sized by a hidden, heaviest-weight copy', async () => {
    boldText(true);
    await renderIt(<FitText style={{ fontSize: 16 }}>Log a meal</FitText>);
    expect(screen.getAllByText('Log a meal')).toHaveLength(1);
    const [shown, sizer] = copies('Log a meal');
    expect(shown).toHaveStyle({ fontSize: 16, alignSelf: 'stretch' });
    expect(sizer).toHaveStyle({ fontSize: 16, fontWeight: '900', height: 0, opacity: 0 });
    expect(sizer).toHaveProp('accessibilityElementsHidden', true);
    expect(sizer).toHaveProp('importantForAccessibility', 'no-hide-descendants');
  });

  test('the hidden copy has the shown label\'s own style, so its width is the width of that text', async () => {
    boldText(true);
    await renderIt(<FitText style={{ fontFamily: 'SomeFont', fontSize: 30, textTransform: 'uppercase' }}>Hello</FitText>);
    const [, sizer] = copies('Hello');
    expect(sizer).toHaveStyle({ fontFamily: 'SomeFont', fontSize: 30, textTransform: 'uppercase' });
  });

  test('the copy appears when Bold Text is turned on and goes when it is turned off', async () => {
    boldText(false);
    await renderIt(<FitText>Easy</FitText>);
    expect(copies('Easy')).toHaveLength(1);
    await act(async () => changed(true));
    expect(copies('Easy')).toHaveLength(2);
    await act(async () => changed(false));
    expect(copies('Easy')).toHaveLength(1);
  });
});

describe('a control that hugs its label, Bold Text on', () => {
  beforeEach(() => boldText(true));

  test.each([
    ['md', 'Log a meal'],
    ['sm', 'Log from a photo'],
    ['touch', 'Your recipes'],
  ] as const)('a %s Button: label in a FitText, named by the label itself', async (size, label) => {
    await renderIt(<Button label={label} size={size} onPress={() => {}} />);
    expect(copies(label)).toHaveLength(2);
    expect(screen.getByRole('button', { name: label })).toBeOnTheScreen();
    expect(screen.getByText(label)).toHaveStyle({ alignSelf: 'stretch', textAlign: 'center' });
  });

  test('a Button keeps the name it was given', async () => {
    await renderIt(<Button label="Withdraw" accessibilityLabel="Withdraw Health data" onPress={() => {}} />);
    expect(screen.getByRole('button', { name: 'Withdraw Health data' })).toBeOnTheScreen();
  });

  test('a Chip: label in a FitText, named by the label, touch size kept', async () => {
    await renderIt(<Chip label="Easy" touch onPress={() => {}} />);
    expect(copies('Easy')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Easy' })).toHaveStyle({ minHeight: tokens.size.touch, minWidth: tokens.size.touch });
  });

  test('an OptionCard tag is a FitText', async () => {
    await renderIt(<OptionCard title="Add a day" tag="Recommended" selected={false} onPress={() => {}} />);
    expect(copies('Recommended')).toHaveLength(2);
  });
});

describe('texts in a row take the room the row has', () => {
  test('the decision eyebrow beside a mark', async () => {
    await renderIt(<DecisionBlock eyebrow="This week's call" aside={<Text>go</Text>} title="Eat a little more" />);
    expect(screen.getByText("This week's call")).toHaveStyle({ flexGrow: 1, flexShrink: 1 });
  });

  test('an OptionCard title', async () => {
    await renderIt(<OptionCard title="Add a day" selected={false} onPress={() => {}} />);
    expect(screen.getByText('Add a day')).toHaveStyle({ flexGrow: 1, flexShrink: 1 });
  });

  test('a Settings row (a list row, K-1043): the label takes the room, the value shrinks and wraps before it', async () => {
    await renderIt(<ListRow label="Training days" value="Mon, Wed, Fri" onPress={() => {}} />);
    expect(screen.getByText('Training days')).toHaveStyle({ flex: 1, minWidth: 0 });
    expect(screen.getByText('Mon, Wed, Fri')).toHaveStyle({ flexShrink: 1 });
  });

  test('the call card line: its eyebrow and its confidence, the confidence still at the end', async () => {
    const decision = {
      id: 'd1',
      madeOn: '2026-12-28',
      action: { type: 'STOP_LOAD_INCREASE' },
      reasons: [],
      confidence: 'MEDIUM',
      nextReview: '2027-01-11',
      nextCallOn: '2027-01-04',
      copyKey: 'decision.stop_load_increase.plateau',
      application: { state: 'APPLIED' },
      declinable: true,
      changes: [],
    } as unknown as components['schemas']['Decision'];
    await renderIt(<CallCard decision={decision} onChanged={() => {}} />);
    expect(screen.getByText("This week's call")).toHaveStyle({ flexGrow: 1, flexShrink: 1 });
    const confidence = screen.getByText(t('today.call.confidence.MEDIUM'));
    expect(confidence).toHaveStyle({ flexGrow: 1, flexShrink: 1, textAlign: 'right' });
  });
});
