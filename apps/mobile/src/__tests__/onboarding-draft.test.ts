/**
 * The onboarding draft (K-306): what the user has answered so far, whether a step can be left, and the profile it
 * becomes. Pure — no screen, no network — so every rule is checked here, fast.
 */
import {
  STEPS,
  birthYearProblem,
  emptyDraft,
  heightCm,
  lighterThanLastMonth,
  stepComplete,
  toProfile,
  toggleDay,
  usualTime,
  type Draft,
} from '@/onboarding/draft';
import { onboardingParams } from '@/onboarding/params';

const THIS_YEAR = 2026;

function complete(overrides: Partial<Draft> = {}): Draft {
  return {
    ...emptyDraft,
    goal: 'DECIDE_FOR_ME',
    programChoice: 'BUILD_ONE_FOR_ME',
    trainingDays: ['MONDAY', 'THURSDAY'],
    sessionsLastMonth: 'FOUR',
    height: { cm: '178', feet: '', inches: '' },
    birthYear: '1994',
    sex: 'FEMALE',
    activityLevel: 'LOW_ACTIVE',
    ...overrides,
  };
}

const CONTEXT = { units: 'METRIC' as const, timeZone: 'Europe/Istanbul', thisYear: THIS_YEAR };

describe('steps', () => {
  test('in the prototype order: goal, program, schedule, about you, activity, photos, expectations', () => {
    expect(STEPS).toEqual(['goal', 'program', 'schedule', 'about', 'activity', 'photos', 'expectations']);
  });

  test('an empty draft can leave only the steps that ask nothing', () => {
    const open = STEPS.filter((step) => stepComplete(step, emptyDraft, 'METRIC', THIS_YEAR));
    expect(open).toEqual(['photos', 'expectations']);
  });

  test('a complete draft can leave every step', () => {
    expect(STEPS.filter((step) => !stepComplete(step, complete(), 'METRIC', THIS_YEAR))).toEqual([]);
  });

  test('"decide for me" is an answer like the others (K-222)', () => {
    expect(stepComplete('goal', { ...emptyDraft, goal: 'DECIDE_FOR_ME' }, 'METRIC', THIS_YEAR)).toBe(true);
  });
});

describe('training days (ADR-027 #15: at most 6, the seventh is rest)', () => {
  test('the limit is 6, as the program contract allows', () => {
    expect(onboardingParams.maxTrainingDays).toBe(6);
  });

  test('days come back in week order, whatever order they were tapped in', () => {
    expect(toggleDay(toggleDay([], 'FRIDAY'), 'MONDAY')).toEqual(['MONDAY', 'FRIDAY']);
  });

  test('tapping a chosen day removes it', () => {
    expect(toggleDay(['MONDAY', 'FRIDAY'], 'MONDAY')).toEqual(['FRIDAY']);
  });

  test('with six chosen, a seventh is not added', () => {
    const six = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;
    expect(toggleDay([...six], 'SUNDAY')).toEqual(six);
  });

  test('with six chosen, one can still be removed', () => {
    const six = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;
    expect(toggleDay([...six], 'MONDAY')).toHaveLength(5);
  });

  test('the schedule needs at least one day and last month\'s sessions', () => {
    expect(stepComplete('schedule', complete({ trainingDays: [] }), 'METRIC', THIS_YEAR)).toBe(false);
    expect(stepComplete('schedule', complete({ sessionsLastMonth: null }), 'METRIC', THIS_YEAR)).toBe(false);
  });
});

describe('what last month says about the plan (I1: start near what you already do)', () => {
  // Even at the top of its answer, every week of the month, is last month fewer sessions than the plan asks?
  test.each([
    ['NONE_OR_ONE', 1, true],
    ['TWO_TO_THREE', 1, true],
    ['FOUR', 1, false],
    ['FOUR', 2, true],
    ['FIVE_OR_MORE', 6, false],
  ] as const)('%s last month, %i days planned → lighter: %s', (last, days, lighter) => {
    expect(lighterThanLastMonth(last, days)).toBe(lighter);
  });
});

describe('usual training time (optional, HH:mm)', () => {
  test.each([
    ['', null],
    ['18:30', '18:30'],
    ['7:05', '07:05'],
    [' 06:00 ', '06:00'],
  ])('"%s" → %s', (typed, time) => {
    expect(usualTime(typed)).toBe(time);
  });

  test.each(['24:00', '18:60', '1830', 'six', '18:3'])('"%s" is not a time', (typed) => {
    expect(usualTime(typed)).toBeUndefined();
  });

  test('a time that is not one keeps the schedule step closed; no time at all does not', () => {
    expect(stepComplete('schedule', complete({ usualTrainingTime: '25:00' }), 'METRIC', THIS_YEAR)).toBe(false);
    expect(stepComplete('schedule', complete({ usualTrainingTime: '' }), 'METRIC', THIS_YEAR)).toBe(true);
  });
});

describe('birth year: adults only, certainly 18 on every day of the year (ADR-027 #13)', () => {
  test('the gap is the contract\'s: this year minus the birth year at least 19', () => {
    expect(onboardingParams.adultMinYearGap).toBe(19);
  });

  test.each([
    ['', 'missing'],
    ['19x4', 'not_a_year'],
    ['94', 'not_a_year'],
    ['1899', 'not_a_year'],
    ['2008', 'too_young'], // 18 only from their birthday on
    ['2007', null],
    ['1994', null],
  ] as const)('"%s" → %s', (typed, problem) => {
    expect(birthYearProblem(typed, THIS_YEAR)).toBe(problem);
  });

  test('a year in the future is not a year', () => {
    expect(birthYearProblem(String(THIS_YEAR + 1), THIS_YEAR)).toBe('not_a_year');
  });
});

describe('height, in the user\'s units, rounded once to whole centimetres', () => {
  test('metric: the centimetres typed', () => {
    expect(heightCm({ cm: '178', feet: '', inches: '' }, 'METRIC')).toBe(178);
    expect(heightCm({ cm: '178,4', feet: '', inches: '' }, 'METRIC')).toBe(178);
  });

  test('imperial: feet and inches', () => {
    expect(heightCm({ cm: '', feet: '5', inches: '10' }, 'IMPERIAL')).toBe(178);
    expect(heightCm({ cm: '', feet: '6', inches: '' }, 'IMPERIAL')).toBe(183); // no inches typed = 0
  });

  test('outside what the profile accepts (100–250 cm) is no height', () => {
    expect(heightCm({ cm: '99', feet: '', inches: '' }, 'METRIC')).toBeNull();
    expect(heightCm({ cm: '251', feet: '', inches: '' }, 'METRIC')).toBeNull();
    expect(heightCm({ cm: '', feet: '3', inches: '3' }, 'IMPERIAL')).toBeNull(); // 99 cm
    expect(heightCm({ cm: '', feet: '3', inches: '4' }, 'IMPERIAL')).toBe(102);
  });

  test('not a number, or 12 inches and more, is no height', () => {
    expect(heightCm({ cm: 'tall', feet: '', inches: '' }, 'METRIC')).toBeNull();
    expect(heightCm({ cm: '', feet: '5', inches: '12' }, 'IMPERIAL')).toBeNull();
    expect(heightCm({ cm: '', feet: '5.5', inches: '' }, 'IMPERIAL')).toBeNull();
    expect(heightCm({ cm: '', feet: '', inches: '70' }, 'IMPERIAL')).toBeNull();
  });

  test('the units shown decide which fields count', () => {
    expect(heightCm({ cm: '178', feet: '', inches: '' }, 'IMPERIAL')).toBeNull();
    expect(heightCm({ cm: '', feet: '5', inches: '10' }, 'METRIC')).toBeNull();
  });

  test('about you needs a height, a birth year old enough, and a sex', () => {
    expect(stepComplete('about', complete({ height: { cm: '', feet: '', inches: '' } }), 'METRIC', THIS_YEAR)).toBe(false);
    expect(stepComplete('about', complete({ birthYear: '2010' }), 'METRIC', THIS_YEAR)).toBe(false);
    expect(stepComplete('about', complete({ sex: null }), 'METRIC', THIS_YEAR)).toBe(false);
  });
});

describe('the profile the draft becomes', () => {
  test('every answer in the contract\'s shape; the check-in day is the parameter; the units are the user\'s', () => {
    expect(toProfile(complete({ usualTrainingTime: '7:30' }), CONTEXT)).toEqual({
      goal: 'DECIDE_FOR_ME',
      sex: 'FEMALE',
      heightCm: 178,
      birthYear: 1994,
      activityLevel: 'LOW_ACTIVE',
      programChoice: 'BUILD_ONE_FOR_ME',
      schedule: {
        trainingDays: ['MONDAY', 'THURSDAY'],
        usualTrainingTime: '07:30',
        sessionsLastMonth: 'FOUR',
        checkInDay: onboardingParams.checkInDay,
        timeZone: 'Europe/Istanbul',
      },
      units: 'METRIC',
    });
  });

  test('the check-in day is Monday (I1 D1: the week closes and the next is planned at once)', () => {
    expect(onboardingParams.checkInDay).toBe('MONDAY');
  });

  test('no time typed: the field is left out, not sent empty', () => {
    expect(toProfile(complete(), CONTEXT).schedule).not.toHaveProperty('usualTrainingTime');
  });

  test('imperial: the height goes in centimetres', () => {
    const imperial = complete({ height: { cm: '', feet: '5', inches: '10' } });
    expect(toProfile(imperial, { ...CONTEXT, units: 'IMPERIAL' })).toMatchObject({ heightCm: 178, units: 'IMPERIAL' });
  });

  test('an incomplete draft is not turned into a profile', () => {
    expect(() => toProfile(complete({ sex: null }), CONTEXT)).toThrow();
    expect(() => toProfile(complete({ birthYear: '2010' }), CONTEXT)).toThrow();
  });
});
