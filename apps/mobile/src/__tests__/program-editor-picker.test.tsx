/**
 * The program editor's "Add a move" picker and its remove and reorder affordances (Evre 7 B2 and B3, plan/evre-7-inceleme.md §12):
 * muscle and equipment chips, "Popular for <group>" first, a row that opens a short preview (muscles, equipment, three cues) with
 * "Add to <day>"; a day removed only after the system's alert; a move's options in the system's action sheet (up, down, remove).
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { useState } from 'react';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';
import { ProgramEditor } from '@/train/ProgramEditor';
import type { EditedDay } from '@/train/programEdit';
import type { Move } from '@/train/trainData';

import { answerAlert, answerSheet } from './support/systemChoices';

type Schemas = components['schemas'];

const CATALOG: Move[] = [
  ['bench_press', 'COMPOUND', ['chest', 'front_delts', 'triceps'], 'BARBELL'],
  ['incline_dumbbell_press', 'COMPOUND', ['chest', 'front_delts', 'triceps'], 'DUMBBELL'],
  ['cable_fly', 'ISOLATION', ['chest'], 'CABLE'],
  ['lat_pulldown', 'COMPOUND', ['lats', 'biceps'], 'CABLE'],
  ['dumbbell_curl', 'ISOLATION', ['biceps'], 'DUMBBELL'],
  ['squat', 'COMPOUND', ['quads', 'glutes'], 'BARBELL'],
].map(([id, kind, muscles, equipment]) => ({
  id: id as string,
  nameKey: `exercises.${id}.name`,
  kind: kind as Schemas['Exercise']['kind'],
  muscles: muscles as string[],
  alternatives: [],
  load: 'EXTERNAL',
  equipment: equipment as Schemas['Equipment'],
  unilateral: false,
  setupFields: [],
}));

const move = (exerciseId: string) => ({ exerciseId, sets: 3, reps: { min: 6, max: 10 } });
const START: EditedDay[] = [
  { id: 'a', name: 'Upper', weekday: 'MONDAY', moves: [move('bench_press'), move('lat_pulldown'), move('squat')] },
  { id: 'b', name: 'Lower', weekday: 'WEDNESDAY', moves: [move('cable_fly')] },
];

let latest: EditedDay[] = START;
function Editor() {
  const [days, setDays] = useState(START);
  latest = days;
  return (
    <ThemeProvider>
      <ProgramEditor days={days} onChange={(next) => setDays((all) => next(all))} moves={CATALOG} makeOwn={async () => 'refused'} />
    </ThemeProvider>
  );
}
const show = () => render(<Editor />);
const names = (day: EditedDay) => day.moves.map((m) => m.exerciseId);

afterEach(() => jest.restoreAllMocks());

describe('Add a move: a picker, not a flat list', () => {
  const open = async () => {
    await show();
    await fireEvent.press(screen.getAllByRole('button', { name: t('programEditor.addMove') })[0]);
  };

  test('opens on "Popular for" the groups the day trains, each move with its muscle and equipment; moves the day has are not offered', async () => {
    await open();
    expect(screen.getByRole('header', { name: t('movePicker.popularFor', { group: 'chest' }) })).toBeOnTheScreen();
    expect(screen.getByText('Chest · Dumbbell')).toBeOnTheScreen();
    expect(screen.getByText(t('movePicker.all'))).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: new RegExp('^Add Bench press, ') })).toBeNull();
    expect(screen.getAllByTestId('move-thumb-DUMBBELL', { includeHiddenElements: true }).length).toBeGreaterThan(0);
  });

  test('a muscle chip narrows the list to the group and puts its popular moves first; the chip again clears it', async () => {
    await open();
    await fireEvent.press(screen.getByRole('button', { name: t('movePicker.group.arms') }));
    expect(screen.getByRole('button', { name: t('movePicker.group.arms') })).toBeSelected();
    expect(screen.getByRole('header', { name: t('movePicker.popularFor', { group: 'arms' }) })).toBeOnTheScreen();
    const row = (name: string) => screen.queryByRole('button', { name: new RegExp(`^${name}, `) });
    expect(row('Dumbbell curl')).toBeOnTheScreen();
    expect(row('Incline dumbbell press')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: t('movePicker.group.arms') }));
    expect(row('Incline dumbbell press')).toBeOnTheScreen();
  });

  test('an equipment chip too; nothing matching says so and offers to clear the chips', async () => {
    await open();
    await fireEvent.press(screen.getByRole('button', { name: t('movePicker.group.legs') }));
    await fireEvent.press(screen.getByRole('button', { name: t('ownMove.equipments.CABLE') }));
    expect(screen.getByText(t('movePicker.empty'))).toBeOnTheScreen();
    await fireEvent.press(screen.getByText(t('movePicker.clear')));
    expect(screen.queryByText(t('movePicker.empty'))).toBeNull();
  });

  test('tapping a move shows its preview in place: the muscles, the equipment, three cues, and "Add to <day>"', async () => {
    await open();
    await fireEvent.press(screen.getByRole('button', { name: new RegExp('^Incline dumbbell press, ') }));
    expect(screen.getByText('Front delts')).toBeOnTheScreen();
    expect(screen.getByText(t('exercises.incline_dumbbell_press.cue1'))).toBeOnTheScreen();
    expect(screen.getByText(t('exercises.incline_dumbbell_press.cue3'))).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: t('movePicker.addLabel', { name: 'Incline dumbbell press', day: 'Upper' }) }));
    expect(names(latest[0])).toEqual(['bench_press', 'lat_pulldown', 'squat', 'incline_dumbbell_press']);
    expect(screen.queryByRole('header', { name: t('programEditor.addMove') })).toBeNull();
  });

  test('the + at the end of a row adds the move at once, for someone who knows its name', async () => {
    await open();
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${t('programEditor.pickLabel', { name: 'Dumbbell curl', range: '' })}`) }));
    expect(names(latest[0])).toContain('dumbbell_curl');
  });

  test('a search narrows across all of it, and the chips narrow the search', async () => {
    await open();
    await fireEvent.changeText(screen.getByLabelText(t('programEditor.search')), 'curl');
    expect(screen.getByRole('button', { name: new RegExp('^Dumbbell curl, ') })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: new RegExp('^Incline dumbbell press, ') })).toBeNull();
    await fireEvent.changeText(screen.getByLabelText(t('programEditor.search')), 'zzzz');
    expect(screen.getByText(t('programEditor.none'))).toBeOnTheScreen();
  });
});

describe('removing and ordering (B3)', () => {
  test('a day is removed only after the system alert says so; "keep" leaves it', async () => {
    await show();
    const alert = answerAlert('keep');
    await fireEvent.press(screen.getByRole('button', { name: t('programEditor.removeDayLabel', { day: 'Upper' }) }));
    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert.mock.calls[0][0]).toBe(t('programEditor.removeDayAsk', { day: 'Upper' }));
    expect(latest.map((d) => d.name)).toEqual(['Upper', 'Lower']);
    answerAlert('confirm');
    await fireEvent.press(screen.getByRole('button', { name: t('programEditor.removeDayLabel', { day: 'Upper' }) }));
    expect(latest.map((d) => d.name)).toEqual(['Lower']);
    expect(screen.getByText(t('programEditor.removed', { name: 'Upper' }))).toBeOnTheScreen();
  });

  test('the remove day control is red with a trash icon, not a grey ghost button', async () => {
    await show();
    const control = screen.getByRole('button', { name: t('programEditor.removeDayLabel', { day: 'Upper' }) });
    expect(within(control).getByText(t('programEditor.removeDay'))).toHaveStyle({ color: '#D12F1F' });
  });

  test("a move's options are the system action sheet: up and down only where there is room, remove in red, Cancel last", async () => {
    await show();
    const sheet = answerSheet(t('programEditor.cancel'));
    await fireEvent.press(screen.getByRole('button', { name: t('programEditor.moveOptionsLabel', { move: 'Bench press' }) }));
    const first = sheet.mock.calls[0][0];
    expect(first.options).toEqual([t('programEditor.moveDown'), t('programEditor.removeFrom', { day: 'Upper' }), t('programEditor.cancel')]);
    expect(first.destructiveButtonIndex).toBe(1);
    expect(first.cancelButtonIndex).toBe(2);
    await fireEvent.press(screen.getByRole('button', { name: t('programEditor.moveOptionsLabel', { move: 'Squat' }) }));
    expect(sheet.mock.calls[1][0].options).toEqual([t('programEditor.moveUp'), t('programEditor.removeFrom', { day: 'Upper' }), t('programEditor.cancel')]);
    await fireEvent.press(screen.getByRole('button', { name: t('programEditor.moveOptionsLabel', { move: 'Lat pulldown' }) }));
    expect(sheet.mock.calls[2][0].options).toHaveLength(4);
    expect(names(latest[0])).toEqual(['bench_press', 'lat_pulldown', 'squat']);
  });

  test('Move down and Move up reorder the day', async () => {
    await show();
    answerSheet(t('programEditor.moveDown'));
    await fireEvent.press(screen.getByRole('button', { name: t('programEditor.moveOptionsLabel', { move: 'Bench press' }) }));
    expect(names(latest[0])).toEqual(['lat_pulldown', 'bench_press', 'squat']);
    answerSheet(t('programEditor.moveUp'));
    await fireEvent.press(screen.getByRole('button', { name: t('programEditor.moveOptionsLabel', { move: 'Squat' }) }));
    expect(names(latest[0])).toEqual(['lat_pulldown', 'squat', 'bench_press']);
  });

  test('Remove from <day> takes the move out, with the Undo bar after', async () => {
    await show();
    answerSheet(t('programEditor.removeFrom', { day: 'Upper' }));
    await fireEvent.press(screen.getByRole('button', { name: t('programEditor.moveOptionsLabel', { move: 'Lat pulldown' }) }));
    expect(names(latest[0])).toEqual(['bench_press', 'squat']);
    await act(async () => {});
    await fireEvent.press(screen.getByRole('button', { name: t('programEditor.undoLabel', { name: 'Lat pulldown' }) }));
    expect(names(latest[0])).toEqual(['bench_press', 'lat_pulldown', 'squat']);
  });
});
