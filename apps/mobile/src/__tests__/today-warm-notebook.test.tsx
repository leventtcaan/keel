/**
 * Today's workout on This week in ADR-094's language (9c-5, prototype gorsel-yon/y5-e1): every kind of the card sits on
 * the sand ground, its "Today" is coral text (today's name, the week path's own coral), the session's name speaks in the
 * serif voice, Start is the one petrol fill, the last time is quiet secondary text (petrol is the decision and the
 * action), the targets are rounded numbers, a move's icon stands off the card's ground, and rows part by space, not a rule.
 */
import { render, screen, within } from '@testing-library/react-native';
import { type StyleProp, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';
import { type ColorScheme, palettes, tokens } from '@/theme/tokens';
import { TodayCard } from '@/today/TodayCard';
import { MoveThumb } from '@/train/MoveThumb';
import type { TodayCard as Card, TodayParts } from '@/today/todayWorkout';
import type { Move } from '@/train/trainData';

type Schemas = components['schemas'];

jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => ({ api: {}, report: jest.fn() }), useUnits: () => 'METRIC' }));

const DAY: Schemas['ProgramDay'] = {
  id: 'c',
  nameKey: 'programDays.full_body_a.name',
  weekday: 'FRIDAY',
  exercises: [
    { exerciseId: 'squat', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1, nextLoadKg: 80, nextReps: 8, lastBestSet: { loadKg: 77.5, reps: 8 } },
    { exerciseId: 'bench_press', baseSets: 3, sets: 3, reps: { min: 6, max: 10 }, targetRir: 1, nextLoadKg: 72.5, nextReps: 9 },
    { exerciseId: 'lat_pulldown', baseSets: 3, sets: 3, reps: { min: 8, max: 12 }, targetRir: 1 },
    { exerciseId: 'plank', baseSets: 2, sets: 2, reps: { min: 30, max: 60 }, targetRir: 1 },
  ],
} as Schemas['ProgramDay'];
const SESSION: Schemas['WeekSession'] = { programDayId: 'c', date: '2026-12-25', exerciseIds: ['squat', 'bench_press', 'lat_pulldown', 'plank'] };
const PROGRAM = {
  id: 'p1',
  today: '2026-12-25',
  weekOf: '2026-12-21',
  source: 'GENERATED',
  days: [DAY],
  cardio: { source: 'GENERATED', minutes: 30, sessionsPerWeek: 3, sessions: [{ weekday: 'FRIDAY', place: 'AFTER_LIFT' }], doneThisWeek: 1, afterLiftOverLine: false },
  week: [SESSION],
} as Schemas['Program'];
const move = (id: string): Move =>
  ({ id, nameKey: `exercises.${id}.name`, kind: 'COMPOUND', muscles: [], alternatives: [], load: 'EXTERNAL', equipment: 'BARBELL', unilateral: false, setupFields: [] }) as unknown as Move;
const PARTS: TodayParts = {
  summary: { state: 'ready', value: { workingSets: 14, liftedKg: 8420 } as Schemas['WorkoutSummary'] },
  moves: new Map(['squat', 'bench_press', 'lat_pulldown', 'plank'].map((id) => [id, move(id)])),
  checkInDay: 'SUNDAY',
};

const KINDS: [string, Card][] = [
  ['session', { kind: 'session', day: DAY, session: SESSION }],
  ['open', { kind: 'open', day: DAY, sets: 2, onPhone: true, workoutId: null }],
  ['done', { kind: 'done', day: DAY, workoutId: 'w1' }],
  ['moved', { kind: 'moved', day: DAY, to: '2026-12-26', undoable: true }],
  ['skipped', { kind: 'skipped', day: DAY, undoable: true }],
  ['rest', { kind: 'rest' }],
  ['restWeek', { kind: 'restWeek' }],
];
const LABEL: Record<string, string> = { open: 'thisWeek.today.open', done: 'thisWeek.today.done' };
/** What the card's heading says, kind by kind. */
const HEADING: Record<string, string> = {
  session: t('programDays.full_body_a.name'),
  open: t('programDays.full_body_a.name'),
  done: t('programDays.full_body_a.name'),
  moved: t('thisWeek.today.rest'),
  skipped: t('programDays.full_body_a.name'),
  rest: t('thisWeek.today.rest'),
  restWeek: t('thisWeek.today.restWeek'),
};

type Style = TextStyle & ViewStyle;
const flat = (node: { props: { style?: unknown } }): Style => StyleSheet.flatten(node.props.style as StyleProp<Style>) ?? {};

describe.each(['light', 'dark'] as ColorScheme[])('%s theme', (scheme) => {
  const p = palettes[scheme];
  const show = (card: Card, program: Schemas['Program'] | null = PROGRAM) =>
    render(
      <ThemeProvider scheme={scheme}>
        <TodayCard card={card} program={program} today="2026-12-25" parts={PARTS} onChanged={() => {}} />
      </ThemeProvider>,
    );

  describe.each(KINDS)('the %s card', (kind, card) => {
    test('lies on the sand ground', async () => {
      await show(card);
      expect(flat(screen.getByTestId('today-card'))).toMatchObject({ backgroundColor: p.tintDay });
    });

    test("its label is today's name in coral text", async () => {
      await show(card);
      expect(flat(screen.getByText(t(LABEL[kind] ?? 'thisWeek.today.today'))).color).toBe(p.progressText);
    });

    test('its heading speaks in the serif voice, in ink', async () => {
      await show(card);
      const heading = within(screen.getByTestId('today-card')).getByRole('header');
      expect(heading).toHaveTextContent(HEADING[kind]);
      expect(flat(heading)).toMatchObject({ fontFamily: tokens.face.display.fontFamily, color: p.text });
    });

    test('the one petrol-filled button is Start on the session (Continue on a workout open here); no other kind has one', async () => {
      await show(card);
      const fills = within(screen.getByTestId('today-card'))
        .queryAllByRole('button')
        .filter((b) => flat(b).backgroundColor === p.cta);
      const primaries = kind === 'session' ? [t('thisWeek.today.startLabel', { session: t('programDays.full_body_a.name') })] : kind === 'open' ? [t('thisWeek.today.continue')] : [];
      expect(fills.map((b) => b.props.accessibilityLabel)).toEqual(primaries);
    });
  });

  describe("the session's moves", () => {
    test("the last time with today's ask is ink, its numbers tabular, not the petrol of the decision", async () => {
      await show(KINDS[0][1]);
      const last = within(screen.getByTestId('move-squat')).getByText(/77\.5/);
      expect(flat(last)).toMatchObject({ color: p.text, fontVariant: ['tabular-nums'] });
      expect(flat(last).color).not.toBe(p.accent);
    });

    test("a target is written in the rounded numbers, tabular, in ink", async () => {
      await show(KINDS[0][1]);
      const target = within(screen.getByTestId('move-bench_press')).getByText('72.5 kg × 9');
      expect(flat(target)).toMatchObject({ fontFamily: tokens.face.displaySemiBold.fontFamily, fontVariant: ['tabular-nums'], color: p.text });
    });

    test("a move's icon stands off the card's ground", async () => {
      await show(KINDS[0][1]);
      const thumb = within(screen.getByTestId('move-squat')).getByTestId('move-thumb-BARBELL', { includeHiddenElements: true });
      expect(flat(thumb).backgroundColor).toBe(p.raise);
      expect(p.raise).not.toBe(p.tintDay);
    });

    test("elsewhere (no sand under it) the icon keeps the surface ground", async () => {
      await render(
        <ThemeProvider scheme={scheme}>
          <MoveThumb equipment="BARBELL" />
        </ThemeProvider>,
      );
      expect(flat(screen.getByTestId('move-thumb-BARBELL', { includeHiddenElements: true })).backgroundColor).toBe(p.surface);
    });

    test.each([
      ['planned', KINDS[0][1], PROGRAM, t('thisWeek.today.cardio', { minutes: 30 })],
      ['logged', KINDS[0][1], { ...PROGRAM, cardio: { ...PROGRAM.cardio, loggedDays: ['2026-12-25'] } }, t('thisWeek.today.cardioDone')],
      ['on a rest day', KINDS[5][1], PROGRAM, t('thisWeek.today.cardio', { minutes: 30 })],
    ] as [string, Card, Schemas['Program'], string][])('the cardio row (%s) has no ruled line above it', async (_, card, program, text) => {
      await show(card, program);
      const row = screen.getByTestId('cardio-row');
      expect(within(row).getByText(text)).toBeOnTheScreen();
      expect(flat(row).borderTopWidth).toBeUndefined();
    });
  });

  test('the done mark is a petrol tick', async () => {
    await show(KINDS[2][1]);
    expect(flat(screen.getByLabelText(t('thisWeek.today.doneLabel')))).toMatchObject({ backgroundColor: p.accent });
  });

  test.each([
    ['skipped', KINDS[4][1]],
    ['moved', KINDS[3][1]],
  ] as [string, Card][])('Undo (%s) is a text button in petrol, never a fill', async (_, card) => {
    await show(card);
    const undo = screen.getByRole('button', { name: t('thisWeek.today.undo') });
    expect(flat(undo).backgroundColor).toBeUndefined();
    expect(flat(within(undo).getByText(t('thisWeek.today.undo'))).color).toBe(p.accent);
  });
});
