/**
 * A day of the week strip, opened (Evre 7: "a tap on a day shows that day's plan or log"). Plain data, all the server's: a day
 * trained shows what was done in it (each move's best working set); a day still planned, its session's moves; a day with a
 * weigh-in only, says so; an empty day is only a rest day, never missed (U7). Nothing is worked out here but the best set of a move.
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { localDay } from '@/today/today';
import { dayName, exerciseName } from '@/train/program';
import { repCount } from '@/train/reps';
import { type UnitSystem, formatLoad } from '@/units/units';

import type { StripDay } from './week';

type Schemas = components['schemas'];

export type DayRow = { id: string; name: string; detail: string };
export type DayView = { state: 'trained' | 'planned' | 'logged' | 'rest'; session: string | null; rows: DayRow[] };

/** The heaviest working set of a move, the more reps breaking a tie. */
function best(sets: Schemas['NewSet'][]): Schemas['NewSet'] {
  return sets.reduce((top, s) => (s.loadKg > top.loadKg || (s.loadKg === top.loadKg && s.reps > top.reps) ? s : top));
}

export function dayView(
  day: StripDay,
  program: Schemas['Program'] | null,
  workouts: Schemas['Workout'][],
  units: UnitSystem,
  moves?: ReadonlyMap<string, { name?: string }>,
): DayView {
  const programDay = (id: string | undefined) => (id === undefined ? undefined : program?.days.find((d) => d.id === id));
  const named = (id: string) => exerciseName(id, moves as never);
  if (day.trained) {
    const done = workouts.filter((w) => w.endedAt !== undefined && localDay(new Date(w.startedAt)) === day.date);
    const order: string[] = [];
    const byMove = new Map<string, Schemas['NewSet'][]>();
    for (const w of done)
      for (const s of w.sets) {
        if (s.setType !== 'WORKING') continue;
        if (!byMove.has(s.exerciseId)) order.push(s.exerciseId);
        byMove.set(s.exerciseId, [...(byMove.get(s.exerciseId) ?? []), s]);
      }
    const rows = order.map((id) => {
      const top = best(byMove.get(id) ?? []);
      const detail = top.loadKg === 0 ? t('train.reps.other', { reps: top.reps }) : t('workoutEnd.set', { load: formatLoad(top.loadKg, units), reps: top.reps });
      return { id, name: named(id), detail };
    });
    const first = done.find((w) => w.programDayId !== undefined);
    const planned = programDay(first?.programDayId);
    return { state: 'trained', session: planned === undefined ? null : dayName(planned), rows };
  }
  const session = program?.week?.find((s) => s.date === day.date && s.skipped !== true);
  const planned = programDay(session?.programDayId);
  if (planned !== undefined && day.planned) {
    const rows = planned.exercises.map((e) => ({ id: e.exerciseId, name: named(e.exerciseId), detail: t('train.setsReps', { sets: e.sets, reps: repCount(e.reps) }) }));
    return { state: 'planned', session: dayName(planned), rows };
  }
  return { state: day.logged ? 'logged' : 'rest', session: null, rows: [] };
}
