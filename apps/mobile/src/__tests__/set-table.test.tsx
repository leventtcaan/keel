/**
 * A set done is told apart from one to do by more than colour (K-807, Differentiate Without Color Alone): a mark beside
 * its number, and VoiceOver says "done".
 */
import { render, screen } from '@testing-library/react-native';

import { t } from '@/copy';
import { SetTable } from '@/train/SetTable';
import type { ExercisePlan } from '@/train/workout';
import { ThemeProvider } from '@/theme/theme';

jest.mock('@/services/ServicesProvider', () => ({ useUnits: () => 'METRIC' }));

const move = { id: 'bench_press', unilateral: false } as never;
const plan: ExercisePlan = {
  exerciseId: 'bench_press',
  current: 1,
  rows: [
    { side: 'BOTH', suggested: { loadKg: 80, reps: 8 }, done: { loadKg: 80, reps: 8 }, last: null },
    { side: 'BOTH', suggested: { loadKg: 80, reps: 8 }, done: null, last: null },
  ] as never,
};

test('the set done carries a mark and says it is done; the one to do neither', async () => {
  await render(
    <ThemeProvider scheme="light">
      <SetTable plan={plan} move={move} />
    </ThemeProvider>,
  );
  expect(screen.getByLabelText(t('workout.setDone', { number: '1' }))).toBeOnTheScreen();
  expect(screen.getByLabelText(t('workout.setToDo', { number: '2' }))).toBeOnTheScreen();
  expect(screen.getAllByText(new RegExp(t('workout.doneMark')))).toHaveLength(1);
});
