/**
 * The onboarding draft (K-306): what the user has answered so far, whether a step can be left, and the profile it
 * becomes. Pure — no screen, no network — so every rule is checked here, fast.
 */
import { avoidList, birthYearProblem, emptyDraft, heightCm, stepComplete, toProfile, type Draft } from '@/onboarding/draft';
import { SCREENS } from '@/onboarding/flow';
import { onboardingParams } from '@/onboarding/params';

const THIS_YEAR = 2026;

function complete(overrides: Partial<Draft> = {}): Draft {
  return {
    ...emptyDraft,
    goal: 'DECIDE_FOR_ME',
    experience: 'Y1_3',
    programChoice: 'BUILD_ONE_FOR_ME',
    trainingDays: ['MONDAY', 'THURSDAY'],
    height: { cm: '178', feet: '', inches: '' },
    birthYear: '1994',
    sex: 'FEMALE',
    activityLevel: 'LOW_ACTIVE',
    healthConsent: 'declined',
    ...overrides,
  };
}

const CONTEXT = { units: 'METRIC' as const, timeZone: 'Europe/Istanbul', thisYear: THIS_YEAR };

describe('steps', () => {
  // The order and the branches are the route's (onboarding-route.test.ts); here, what each step needs to be left.
  test('an empty draft can leave only the steps that ask nothing', () => {
    const open = SCREENS.filter((step) => stepComplete(step, emptyDraft, 'METRIC', THIS_YEAR));
    expect(open).toEqual(['foods', 'photos', 'expectations', 'appleHealth']);
  });

  test('the consent step is answered either way, but answered', () => {
    expect(stepComplete('consent', complete({ healthConsent: null }), 'METRIC', THIS_YEAR)).toBe(false);
    expect(stepComplete('consent', complete({ healthConsent: 'declined' }), 'METRIC', THIS_YEAR)).toBe(true);
  });

  test('a complete draft can leave every step', () => {
    expect(SCREENS.filter((step) => !stepComplete(step, complete(), 'METRIC', THIS_YEAR))).toEqual([]);
  });

  test('"decide for me" is an answer like the others (K-222)', () => {
    expect(stepComplete('goal', { ...emptyDraft, goal: 'DECIDE_FOR_ME' }, 'METRIC', THIS_YEAR)).toBe(true);
  });

  test.each(['NEW', 'UNDER_1Y', 'Y1_3', 'Y3_PLUS'] as const)('the experience: %s is an answer (ADR-072 #3)', (experience) => {
    expect(stepComplete('experience', { ...emptyDraft, experience }, 'METRIC', THIS_YEAR)).toBe(true);
    expect(stepComplete('experience', emptyDraft, 'METRIC', THIS_YEAR)).toBe(false);
  });
});

describe('training days: one question, how many (ADR-072 #4)', () => {
  test('the limit is 6, as the program contract allows', () => {
    expect(onboardingParams.maxTrainingDays).toBe(6);
  });

  test('the days step needs only the days placed: last month and a usual time are no longer asked', () => {
    expect(stepComplete('days', complete({ trainingDays: [] }), 'METRIC', THIS_YEAR)).toBe(false);
    expect(stepComplete('days', { ...emptyDraft, trainingDays: ['MONDAY', 'THURSDAY'] }, 'METRIC', THIS_YEAR)).toBe(true);
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

describe('health answers, only with the consent (ADR-027 #14, ADR-030 #25)', () => {
  const granted = (overrides: Partial<Draft> = {}) => complete({ healthConsent: 'granted', weight: '82.4', ...overrides });

  test('with the consent, about you needs the weight; the waist may stay empty', () => {
    expect(stepComplete('about', granted(), 'METRIC', THIS_YEAR)).toBe(true);
    expect(stepComplete('about', granted({ weight: '' }), 'METRIC', THIS_YEAR)).toBe(false);
    expect(stepComplete('about', granted({ weight: 'heavy' }), 'METRIC', THIS_YEAR)).toBe(false);
  });

  test('the weight and the waist within what the server keeps (contract: above 0, at most 500 kg and 300 cm)', () => {
    for (const weight of ['0', '0.001', '501']) {
      expect(stepComplete('about', granted({ weight }), 'METRIC', THIS_YEAR)).toBe(false);
    }
    expect(stepComplete('about', granted({ weight: '500' }), 'METRIC', THIS_YEAR)).toBe(true);
    expect(stepComplete('about', granted({ weight: '1200' }), 'IMPERIAL', THIS_YEAR)).toBe(false); // 544 kg
    expect(stepComplete('about', granted({ waist: '301' }), 'METRIC', THIS_YEAR)).toBe(false);
    expect(stepComplete('about', granted({ waist: '300' }), 'METRIC', THIS_YEAR)).toBe(true);
  });

  test('a waist typed must be a waist', () => {
    expect(stepComplete('about', granted({ waist: '84' }), 'METRIC', THIS_YEAR)).toBe(true);
    expect(stepComplete('about', granted({ waist: 'x' }), 'METRIC', THIS_YEAR)).toBe(false);
  });

  test('without the consent, weight and waist are not asked, whatever was typed before', () => {
    expect(stepComplete('about', complete({ weight: '', waist: 'x' }), 'METRIC', THIS_YEAR)).toBe(true);
  });

  test('the foods to avoid: one per comma or line, trimmed, empty and repeated ones dropped', () => {
    expect(avoidList(' peanuts, shellfish\n\nGluten ,peanuts,  ')).toEqual(['peanuts', 'shellfish', 'Gluten']);
    expect(avoidList('')).toEqual([]);
  });

  test('the profile carries the foods to avoid only with the consent', () => {
    expect(toProfile(granted({ avoid: 'peanuts' }), CONTEXT).food).toEqual({ avoid: ['peanuts'] });
    expect(toProfile(complete({ avoid: 'peanuts' }), CONTEXT)).not.toHaveProperty('food');
    expect(toProfile(granted({ avoid: '  ' }), CONTEXT)).not.toHaveProperty('food');
  });
});

describe('the profile the draft becomes', () => {
  test('every answer in the contract\'s shape; the check-in day is the parameter; the units are the user\'s', () => {
    expect(toProfile(complete(), CONTEXT)).toEqual({
      goal: 'DECIDE_FOR_ME',
      sex: 'FEMALE',
      heightCm: 178,
      birthYear: 1994,
      activityLevel: 'LOW_ACTIVE',
      experience: 'Y1_3',
      programChoice: 'BUILD_ONE_FOR_ME',
      schedule: {
        trainingDays: ['MONDAY', 'THURSDAY'],
        checkInDay: onboardingParams.checkInDay,
        timeZone: 'Europe/Istanbul',
      },
      units: 'METRIC',
    });
  });

  test('the check-in day is Monday (I1 D1: the week closes and the next is planned at once)', () => {
    expect(onboardingParams.checkInDay).toBe('MONDAY');
  });

  test('neither last month\'s sessions nor a usual time goes out: no longer asked (ADR-072 #4)', () => {
    expect(toProfile(complete(), CONTEXT).schedule).not.toHaveProperty('usualTrainingTime');
    expect(toProfile(complete(), CONTEXT).schedule).not.toHaveProperty('sessionsLastMonth');
  });

  test('imperial: the height goes in centimetres', () => {
    const imperial = complete({ height: { cm: '', feet: '5', inches: '10' } });
    expect(toProfile(imperial, { ...CONTEXT, units: 'IMPERIAL' })).toMatchObject({ heightCm: 178, units: 'IMPERIAL' });
  });

  test('an incomplete draft is not turned into a profile', () => {
    expect(() => toProfile(complete({ sex: null }), CONTEXT)).toThrow();
    expect(() => toProfile(complete({ birthYear: '2010' }), CONTEXT)).toThrow();
    expect(() => toProfile(complete({ experience: null }), CONTEXT)).toThrow();
  });
});
