/**
 * The coach in ADR-094's language (9c-6a, prototype gorsel-yon/y5-e3): the person's words are a petrol bubble on the right,
 * the coach's answer a sand bubble on the left, the call it speaks of a card on the sage ground of time; the ready questions
 * are sand pills by the box; the box is one line at the foot ("Message the coach"), its petrol send the screen's one fill, its
 * label and the dictation hint read by VoiceOver, not printed.
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { Dimensions, type StyleProp, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import CoachScreen from '@/app/coach';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';
import { type ColorScheme, palettes, tokens } from '@/theme/tokens';

type Schemas = components['schemas'];
type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown): Answer => ({ data, response: new Response(null, { status: 200 }) });
const refused = (status: number, code: string): Answer => ({ error: { code, message: 'x' }, response: new Response(null, { status }) });

const DECISION: Schemas['Decision'] = {
  id: 'd1',
  madeOn: '2026-09-28',
  action: { type: 'ADJUST_CALORIES', kcalPerDay: -250 } as Schemas['Decision']['action'],
  reasons: [{ rule: 'not_toward_goal', source: { tag: 'EXPERIENCE' } }],
  confidence: 'MEDIUM',
  nextReview: '2026-10-05',
  nextCallOn: '2026-10-12',
  copyKey: 'decision.adjust_calories.not_toward_goal',
  application: { state: 'PENDING' },
  declinable: false,
  changes: [],
};
const CALL = { decisionId: 'd1', copyKey: 'decision.adjust_calories.not_toward_goal', nextReview: '2026-10-05', nextCallOn: '2026-10-12' };

let mockSent: Answer = ok({ mode: 'DETERMINISTIC', copyKey: 'coach.answer.call', call: CALL });
const mockAnswers: Record<string, Answer> = { '/v1/decisions/current': ok(DECISION), '/v1/program': refused(404, 'NOT_FOUND'), '/v1/weigh-ins': ok([]) };
const mockServices = {
  api: {
    GET: jest.fn(async (path: string) => mockAnswers[path] ?? refused(404, 'NOT_FOUND')),
    POST: jest.fn(async () => mockSent),
  },
  report: () => {},
};
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: () => {} }, useLocalSearchParams: () => ({}) }));
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices }));
// KeyboardAvoidingView as a plain view that shows the offset it was given (the keyboard itself is the device's).
jest.mock('react-native/Libraries/Components/Keyboard/KeyboardAvoidingView', () => {
  const { View: Plain } = jest.requireActual('react-native');
  return { __esModule: true, default: ({ keyboardVerticalOffset, ...rest }: { keyboardVerticalOffset?: number }) => <Plain testID="keyboard-avoiding" accessibilityValue={{ now: keyboardVerticalOffset }} {...rest} /> };
});

type Style = TextStyle & ViewStyle;
const flat = (node: { props: { style?: unknown } }): Style => StyleSheet.flatten(node.props.style as StyleProp<Style>) ?? {};

beforeEach(() => {
  mockSent = ok({ mode: 'DETERMINISTIC', copyKey: 'coach.answer.call', call: CALL });
});

describe.each(['light', 'dark'] as ColorScheme[])('%s theme', (scheme) => {
  const p = palettes[scheme];
  const show = async () => {
    await render(
      <ThemeProvider scheme={scheme}>
        <CoachScreen />
      </ThemeProvider>,
    );
    await act(async () => {});
  };
  const send = async (words: string) => {
    await act(async () => fireEvent.changeText(screen.getByLabelText(t('coach.input')), words));
    await act(async () => fireEvent.press(screen.getByRole('button', { name: t('coach.send') })));
  };

  test("the person's words are a petrol bubble on the right, in the text on petrol", async () => {
    await show();
    await send('Why less food?');
    const bubble = screen.getByTestId('user-bubble');
    expect(flat(bubble)).toMatchObject({ backgroundColor: p.accent, alignSelf: 'flex-end' });
    expect(flat(within(bubble).getByText('Why less food?')).color).toBe(p.onAccent);
  });

  test("the coach's answer is a sand bubble on the left; the week's note opens in one", async () => {
    await show();
    const note = screen.getAllByTestId('coach-bubble')[0];
    expect(flat(note)).toMatchObject({ backgroundColor: p.tintDay, alignSelf: 'flex-start' });
    expect(within(note).getByText(t('coach.note.title'))).toBeOnTheScreen();
  });

  test('the call it speaks of is a card on the sage ground, its title in the serif voice, outside the bubble', async () => {
    await show();
    await send('Why?');
    const card = screen.getByTestId('coach-call');
    expect(flat(card)).toMatchObject({ backgroundColor: p.tintTime });
    expect(flat(within(card).getByText(t('decision.adjust_calories.not_toward_goal.title')))).toMatchObject({ fontFamily: tokens.face.display.fontFamily });
    for (const bubble of screen.getAllByTestId('coach-bubble')) expect(within(bubble).queryByTestId('coach-call')).toBeNull();
  });

  test('a problem is said in a sand bubble too, its way on beside it', async () => {
    mockSent = refused(403, 'ENTITLEMENT_REQUIRED');
    await show();
    await send('Why?');
    const said = screen.getAllByTestId('coach-bubble').find((b) => within(b).queryByText(t('coach.subscription')) !== null);
    expect(said).toBeDefined();
    expect(flat(said!)).toMatchObject({ backgroundColor: p.tintDay });
  });

  test('the ready questions are sand pills by the box, no outline', async () => {
    await show();
    const bar = within(screen.getByTestId('coach-bar'));
    for (const key of ['coach.starter.why', 'coach.starter.week', 'coach.starter.whatif', 'today.chips.why']) {
      const pill = bar.getByRole('button', { name: t(key) });
      expect(flat(pill).backgroundColor).toBe(p.tintDay);
      expect(flat(pill).borderWidth ?? 0).toBe(0);
    }
  });

  test('the box is one line on sand, its words inside it; label and dictation are for VoiceOver, not printed', async () => {
    await show();
    const box = screen.getByLabelText(t('coach.input'));
    expect(within(screen.getByTestId('coach-bar')).getByLabelText(t('coach.input'))).toBe(box);
    expect(box.props.placeholder).toBe(t('coach.input'));
    expect(box.props.accessibilityHint).toBe(t('coach.dictate'));
    expect(flat(box)).toMatchObject({ backgroundColor: p.tintDay, borderColor: p.edge });
    expect(screen.queryByText(t('coach.input'))).toBeNull();
    expect(screen.queryByText(t('coach.dictate'))).toBeNull();
  });

  test('send is the one petrol button, held until there are words', async () => {
    await show();
    const fills = () => screen.getAllByRole('button').filter((b) => flat(b).backgroundColor === p.cta);
    expect(fills().map((b) => b.props.accessibilityLabel)).toEqual([t('coach.send')]);
    expect(screen.getByRole('button', { name: t('coach.send') })).toBeDisabled();
    await act(async () => fireEvent.changeText(screen.getByLabelText(t('coach.input')), 'Why?'));
    expect(screen.getByRole('button', { name: t('coach.send') })).toBeEnabled();
  });
});

test('opened as a sheet, the box is lifted by where the sheet starts on the screen, so the keyboard never covers it', async () => {
  await render(
    <ThemeProvider scheme="light">
      <CoachScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
  expect(screen.getByTestId('keyboard-avoiding').props.accessibilityValue).toEqual({ now: 0 });
  // A sheet 62 pt shorter than the window (it stands on the screen's foot), the view 4 pt down inside it.
  const sheet = Dimensions.get('window').height - 62;
  await act(async () => fireEvent(screen.getByTestId('coach-sheet'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 440, height: sheet } } }));
  await act(async () => fireEvent(screen.getByTestId('coach-frame'), 'layout', { nativeEvent: { layout: { x: 0, y: 4, width: 440, height: sheet - 38 } } }));
  expect(screen.getByTestId('keyboard-avoiding').props.accessibilityValue).toEqual({ now: 66 });
});
