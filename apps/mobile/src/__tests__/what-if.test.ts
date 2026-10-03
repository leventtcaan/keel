/**
 * "What would change the call" (K-610, L3 Y3, prototype 5.6): the server's example weeks in words — each "if" its three
 * choices, each "then" the call's own title. Example data, said so; the engine's, no model (U1).
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { whatIfRows } from '@/today/whatIf';

type WhatIf = components['schemas']['WhatIf'];
type Scenario = WhatIf['scenarios'][number];

const scenario = (when: Scenario['when'], copyKey: string): Scenario => ({
  when,
  decision: { action: { type: 'CONTINUE' } as Scenario['decision']['action'], reasons: [], confidence: 'HIGH', nextReview: '2026-10-12', copyKey },
});

test('each example week: its three choices as the "if", the call’s title as the "then", in the server’s order', () => {
  const rows = whatIfRows({
    example: true,
    scenarios: [
      scenario({ trend: 'TOWARD_GOAL', adherence: 'ON_TRACK', training: 'HOLDING' }, 'decision.continue.toward_goal'),
      scenario({ trend: 'FLAT', adherence: 'UNDER', training: 'DROPPING' }, 'decision.fix_adherence.adherence_low'),
    ],
  });

  expect(rows).toEqual([
    {
      when: [t('whatIf.trend.TOWARD_GOAL'), t('whatIf.adherence.ON_TRACK'), t('whatIf.training.HOLDING')].join(' · '),
      then: t('decision.continue.toward_goal.title'),
    },
    {
      when: [t('whatIf.trend.FLAT'), t('whatIf.adherence.UNDER'), t('whatIf.training.DROPPING')].join(' · '),
      then: t('decision.fix_adherence.adherence_low.title'),
    },
  ]);
});

test('the words exist and say it is example data, with no model behind it', () => {
  for (const key of ['whatIf.title', 'whatIf.example', 'whatIf.trend.TOWARD_GOAL', 'whatIf.trend.FLAT', 'whatIf.adherence.ON_TRACK',
    'whatIf.adherence.UNDER', 'whatIf.training.HOLDING', 'whatIf.training.DROPPING', 'whatIf.open', 'whatIf.failed']) {
    expect(t(key)).not.toMatch(/missing/);
  }
  expect(t('whatIf.example')).toMatch(/example/i);
});
