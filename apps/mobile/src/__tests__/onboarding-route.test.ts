/**
 * The onboarding's route (ADR-072 #2-#4): one question per screen, in an order that branches on two answers: the new
 * lifter, the experienced one and the one who brings a program walk different questions. Pure, so every branch is
 * checked here; onboarding-flow.test.tsx walks the screens themselves.
 */
import { type Answers, RETIRED_STEPS, SCREENS, branchOf, nextStep, questionsOf, walk } from '@/onboarding/flow';

const answers = (overrides: Partial<Answers> = {}): Answers => ({ experience: null, programChoice: null, ...overrides });

describe('the branch: decided by the experience and the program answers', () => {
  test('before either is answered, and for someone just starting: the new lifter', () => {
    expect(branchOf(answers())).toBe('newLifter');
    expect(branchOf(answers({ experience: 'NEW', programChoice: 'BUILD_ONE_FOR_ME' }))).toBe('newLifter');
  });

  test.each(['UNDER_1Y', 'Y1_3', 'Y3_PLUS'] as const)('%s with a program built for them: experienced', (experience) => {
    expect(branchOf(answers({ experience, programChoice: 'BUILD_ONE_FOR_ME' }))).toBe('experienced');
  });

  test.each(['NEW', 'UNDER_1Y', 'Y1_3', 'Y3_PLUS', null] as const)('bringing a program, whatever the experience (%s): own program', (experience) => {
    expect(branchOf(answers({ experience, programChoice: 'BRING_MY_OWN' }))).toBe('ownProgram');
  });
});

describe('the questions of each branch (ADR-072 #2)', () => {
  test('the new lifter: days, then the consent and the questions for the energy math; no starting weights (#3)', () => {
    expect(questionsOf('newLifter')).toEqual(['goal', 'experience', 'program', 'days', 'consent', 'about', 'activity']);
  });

  test('the experienced lifter: the same, then the starting weights (#3, #5)', () => {
    expect(questionsOf('experienced')).toEqual(['goal', 'experience', 'program', 'days', 'consent', 'about', 'activity', 'weights']);
  });

  test('the own program: brought in and reviewed in place of the days (ADR-073), then the starting weights', () => {
    expect(questionsOf('ownProgram')).toEqual([
      'goal', 'experience', 'program', 'ownProgram', 'review', 'consent', 'about', 'activity', 'weights',
    ]);
  });

  test('the longest branch with the screens after it (preparing, plan, paywall) stays within 12 screens (I1 F1)', () => {
    const longest = Math.max(...(['newLifter', 'experienced', 'ownProgram'] as const).map((branch) => questionsOf(branch).length));
    expect(longest + 3).toBeLessThanOrEqual(12);
  });
});

describe('the walk: the screens a user goes through today', () => {
  test('the new lifter walks every question of the branch, and it ends there: activity saves (K-967 adds what follows)', () => {
    expect(walk(answers({ experience: 'NEW', programChoice: 'BUILD_ONE_FOR_ME' }))).toEqual([
      'goal', 'experience', 'program', 'days', 'consent', 'about', 'activity',
    ]);
  });

  test('the experienced lifter: the starting weights join with their screen (K-967)', () => {
    expect(walk(answers({ experience: 'Y3_PLUS', programChoice: 'BUILD_ONE_FOR_ME' }))).toEqual([
      'goal', 'experience', 'program', 'days', 'consent', 'about', 'activity',
    ]);
  });

  test('the own program: until bringing it in has its screen (K-968), the days are asked as today', () => {
    expect(walk(answers({ experience: 'Y1_3', programChoice: 'BRING_MY_OWN' }))).toEqual([
      'goal', 'experience', 'program', 'days', 'consent', 'about', 'activity',
    ]);
  });

  test('every step walked has a screen, and every screen is walked by someone', () => {
    const walked = new Set(
      (['NEW', 'Y3_PLUS'] as const).flatMap((experience) =>
        (['BUILD_ONE_FOR_ME', 'BRING_MY_OWN'] as const).flatMap((programChoice) => walk(answers({ experience, programChoice }))),
      ),
    );
    expect([...walked].sort()).toEqual([...SCREENS].sort());
  });

  test('the foods to avoid, photos, what to expect and Apple Health are off every walk (ADR-069 #3, ADR-072 #8)', () => {
    expect(RETIRED_STEPS).toEqual(['foods', 'photos', 'expectations', 'appleHealth']);
    for (const step of RETIRED_STEPS) expect(SCREENS as readonly string[]).not.toContain(step);
  });
});

describe('the next step', () => {
  test('follows the walk', () => {
    expect(nextStep('goal', answers())).toBe('experience');
    expect(nextStep('program', answers({ programChoice: 'BRING_MY_OWN' }))).toBe('days');
    expect(nextStep('consent', answers())).toBe('about');
  });

  test('none after the last step, and none from a step off the walk', () => {
    expect(nextStep('activity', answers())).toBeNull();
    for (const step of RETIRED_STEPS) expect(nextStep(step, answers())).toBeNull();
  });
});
