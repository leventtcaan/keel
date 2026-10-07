/**
 * The program draft from another app's export (K-957, ADR-073 #1, Ek 1): the routines of the last weeks become days, with
 * their moves, sets, the reps seen and their weekday; a move not matched keeps the file's name, to become the user's own
 * move when they confirm. Nothing is sent: the draft is the phone's until the user makes it their program.
 */
import fs from 'node:fs';
import path from 'node:path';

import { draftProgram, ownProgram, type ProgramDraft } from '@/import/draft';
import { type FileSession, readExport } from '@/import/formats';
import { importParams } from '@/import/params';
import { workoutParams } from '@/train/params';

const fixture = (name: string) => fs.readFileSync(path.join(__dirname, 'fixtures/import', name), 'utf8');

function sessionsOf(text: string): FileSession[] {
  const read = readExport(text, { routines: true });
  if (read.kind !== 'read') throw new Error(`not read: ${read.kind}`);
  return read.sessions;
}

const days = (draft: ProgramDraft) => (draft.kind === 'draft' ? draft.days : []);

/** A session of `routine` on a day, each move's working sets as their reps. */
function session(routine: string, y: number, m: number, d: number, moves: [string, number[]][]): FileSession {
  const startedAt = new Date(y, m - 1, d, 18, 0);
  return { startedAt, endedAt: startedAt, routine, sets: moves.flatMap(([name, reps]) => reps.map((r) => ({ name, warmUp: false, weight: 50, reps: r }))) };
}

describe('from a Strong export', () => {
  const choices = new Map<string, string | null>([
    ['Bench Press (Barbell)', 'bench_press'],
    ['Bent Over Row (Barbell)', 'barbell_row'],
    ['Squat (Barbell)', 'squat'],
    ['Romanian Deadlift (Barbell)', 'romanian_deadlift'],
    ['Overhead Press (Barbell)', 'overhead_press'],
    ['Incline Bench Press (Dumbbell)', 'incline_dumbbell_press'],
    ['Bicep Curl (Dumbbell)', 'dumbbell_curl'],
  ]);

  test('each routine of the last weeks is a day: its moves in order, sets, the reps seen, its weekday', () => {
    expect(draftProgram(sessionsOf(fixture('strong-program.csv')), choices)).toEqual({
      kind: 'draft',
      days: [
        {
          name: 'Upper',
          weekday: 'MONDAY',
          moves: [
            // Strong does not mark a warm-up (H13 B2): the light set of 12 counts, the middle half of the reps does not stretch.
            { exerciseId: 'bench_press', sets: 4, reps: { min: 7, max: 9 } },
            { exerciseId: 'barbell_row', sets: 3, reps: { min: 9, max: 11 } },
            // In half the sessions, and in no catalog move: the user's own move, by the file's name.
            { ownName: 'Landmine Press', sets: 3, reps: { min: 12, max: 14 } },
          ],
        },
        {
          name: 'Lower',
          weekday: 'THURSDAY',
          moves: [
            { exerciseId: 'squat', sets: 3, reps: { min: 5, max: 7 } },
            { exerciseId: 'romanian_deadlift', sets: 3, reps: { min: 8, max: 10 } },
          ],
        },
      ],
    });
  });

  test('a routine done once, a move done once and what is older than the window are not in it', () => {
    const draft = JSON.stringify(draftProgram(sessionsOf(fixture('strong-program.csv')), choices));

    expect(draft).not.toContain('Arms');
    expect(draft).not.toContain('incline_dumbbell_press');
    expect(draft).not.toContain('overhead_press');
  });

  test('a history without routine names gives no draft, and says so', () => {
    const unnamed = fixture('strong-program.csv').replace(/"(Upper|Lower|Arms)"/g, '""');

    expect(draftProgram(sessionsOf(unnamed), choices)).toEqual({ kind: 'noRoutine' });
  });
});

describe('from a Hevy export', () => {
  const choices = new Map<string, string | null>([
    ['Incline Bench Press (Dumbbell)', 'incline_dumbbell_press'],
    ['Lateral Raise (Dumbbell)', 'lateral_raise'],
    ['Lat Pulldown (Cable)', 'lat_pulldown'],
    ['Pull Up', 'pull_up'],
    ['Leg Press (Machine)', 'leg_press'],
    ['Seated Leg Curl (Machine)', 'seated_leg_curl'],
  ]);

  test('warm-ups are not sets of the program; a day on its weekday two times in three keeps it', () => {
    expect(days(draftProgram(sessionsOf(fixture('hevy-program.csv')), choices))).toEqual([
      {
        name: 'Push',
        weekday: 'MONDAY',
        moves: [
          { exerciseId: 'incline_dumbbell_press', sets: 3, reps: { min: 8, max: 10 } },
          { exerciseId: 'lateral_raise', sets: 2, reps: { min: 12, max: 15 } },
        ],
      },
      {
        name: 'Pull',
        weekday: 'WEDNESDAY',
        moves: [
          { exerciseId: 'lat_pulldown', sets: 3, reps: { min: 10, max: 12 } },
          { exerciseId: 'pull_up', sets: 2, reps: { min: 6, max: 8 } },
        ],
      },
      {
        name: 'Legs',
        weekday: 'FRIDAY',
        moves: [
          { exerciseId: 'leg_press', sets: 2, reps: { min: 10, max: 12 } },
          { exerciseId: 'seated_leg_curl', sets: 2, reps: { min: 11, max: 13 } },
        ],
      },
    ]);
  });
});

describe('the rules', () => {
  const none = new Map<string, string | null>();

  test('names that never repeat are no routine', () => {
    const sessions = [session('Mon', 2025, 3, 3, [['Squat', [5]]]), session('Tue', 2025, 3, 4, [['Squat', [5]]])];

    expect(draftProgram(sessions, none)).toEqual({ kind: 'noRoutine' });
  });

  test('a move in fewer than half of its routine sessions is left out; the sets are the lower middle count', () => {
    const sessions = [
      session('A', 2025, 3, 3, [['Squat', [5, 5]], ['Lunge', [10]]]),
      session('A', 2025, 3, 10, [['Squat', [5, 5, 5]]]),
      session('A', 2025, 3, 17, [['Squat', [5, 5, 5, 5]]]),
      session('A', 2025, 3, 24, [['Squat', [5, 5, 5, 5, 5]]]),
    ];

    expect(days(draftProgram(sessions, none))[0].moves).toEqual([{ ownName: 'Squat', sets: 3, reps: { min: 5, max: 5 + importParams.draft.repSpanMin } }]);
  });

  test('a weekday tie leaves the day without one; two days wanting one weekday, the larger share keeps it', () => {
    const sessions = [
      session('A', 2025, 3, 3, [['Squat', [5]]]), // Monday
      session('A', 2025, 3, 10, [['Squat', [5]]]), // Monday
      session('A', 2025, 3, 17, [['Squat', [5]]]), // Monday
      session('B', 2025, 3, 4, [['Press', [8]]]), // Tuesday
      session('B', 2025, 3, 11, [['Press', [8]]]), // Tuesday
      session('B', 2025, 3, 19, [['Press', [8]]]), // Wednesday
      session('B', 2025, 3, 26, [['Press', [8]]]), // Wednesday
      session('C', 2025, 3, 10, [['Row', [10]]]), // Monday
      session('C', 2025, 3, 24, [['Row', [10]]]), // Monday
      session('C', 2025, 3, 28, [['Row', [10]]]), // Friday
    ];
    const draft = days(draftProgram(sessions, none));

    // A is on Monday every time, C two times in three: A keeps it. Days without one follow, in the order first done.
    expect(draft.map((day) => [day.name, day.weekday])).toEqual([
      ['A', 'MONDAY'],
      ['B', undefined],
      ['C', undefined],
    ]);
  });

  test('the draft is always one the contract takes: days, moves, sets, reps and the name within OwnProgram', () => {
    const long = 'Upper body with a very long name that the export allowed but our program does not';
    const many = Array.from({ length: workoutParams.programDayMovesMax + 5 }, (_, i): [string, number[]] => [`Move ${i}`, [workoutParams.maxReps]]);
    const sets = Array.from({ length: workoutParams.programMoveSetsMax + 5 }, () => 8);
    const routines = Array.from({ length: workoutParams.programDaysMax + 2 }, (_, i) => `R${i}`);
    const sessions = [
      session(long, 2025, 3, 3, many),
      session(long, 2025, 3, 10, many),
      session(long, 2025, 3, 17, many),
      ...routines.flatMap((name, i) => [session(name, 2025, 3, 4 + (i % 3), [['Curl', sets]]), session(name, 2025, 3, 18 + (i % 3), [['Curl', sets]])]),
    ];
    const draft = days(draftProgram(sessions, none));

    expect(draft).toHaveLength(workoutParams.programDaysMax);
    expect(draft[0].name).toBe(long.slice(0, workoutParams.programDayNameMaxChars).trim());
    expect(draft[0].moves).toHaveLength(workoutParams.programDayMovesMax);
    expect(draft[0].moves[0].reps).toEqual({ min: workoutParams.maxReps - importParams.draft.repSpanMin, max: workoutParams.maxReps });
    expect(draft[1].moves[0].sets).toBe(workoutParams.programMoveSetsMax);
  });
});

describe('confirming it', () => {
  const draft = days(draftProgram(sessionsOf(fixture('strong-program.csv')), new Map([
    ['Bench Press (Barbell)', 'bench_press'],
    ['Bent Over Row (Barbell)', 'barbell_row'],
    ['Squat (Barbell)', 'squat'],
    ['Romanian Deadlift (Barbell)', 'romanian_deadlift'],
  ])));

  test('a move named only by the file goes in as the own move made for it', () => {
    const own = new Map([['Landmine Press', 'custom:7b0c5a8e-3f4e-4b1a-9d2c-1e2f3a4b5c6d']]);

    expect(ownProgram(draft, own)?.days[0]).toEqual({
      name: 'Upper',
      weekday: 'MONDAY',
      exercises: [
        { exerciseId: 'bench_press', sets: 4, reps: { min: 7, max: 9 } },
        { exerciseId: 'barbell_row', sets: 3, reps: { min: 9, max: 11 } },
        { exerciseId: 'custom:7b0c5a8e-3f4e-4b1a-9d2c-1e2f3a4b5c6d', sets: 3, reps: { min: 12, max: 14 } },
      ],
    });
  });

  test('until then there is no program to send', () => {
    expect(ownProgram(draft, new Map())).toBeNull();
  });
});
