/**
 * "What would change the call" (K-610, prototype 5.6): the example weeks the server ran through the rules, each "if" with
 * its "then", under a line that says it is example data — never the user's own (U1, U2).
 */
import { act, render, screen } from '@testing-library/react-native';

import WhatIfScreen from '@/app/what-if';
import type { components } from '@/api/schema';
import { t } from '@/copy';
import { ThemeProvider } from '@/theme/theme';

type WhatIf = components['schemas']['WhatIf'];
type Answer = { data?: unknown; error?: { code: string; message: string }; response: Response };
const ok = (data: unknown): Answer => ({ data, response: new Response(null, { status: 200 }) });
const refused = (status: number, code: string): Answer => ({ error: { code, message: 'x' }, response: new Response(null, { status }) });

const EXAMPLE: WhatIf = {
  example: true,
  scenarios: [
    {
      when: { trend: 'FLAT', adherence: 'ON_TRACK', training: 'HOLDING' },
      decision: { action: { type: 'ADJUST_CALORIES', kcalPerDay: -500 } as WhatIf['scenarios'][number]['decision']['action'], reasons: [],
        confidence: 'HIGH', nextReview: '2026-10-12', copyKey: 'decision.adjust_calories.not_toward_goal' },
    },
  ],
};

let mockAnswer: Answer | 'offline' = ok(EXAMPLE);
const mockGET = jest.fn(async () => {
  if (mockAnswer === 'offline') throw new TypeError('Network request failed');
  return mockAnswer;
});
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() }, useLocalSearchParams: () => ({ id: 'd1' }) }));
const mockServices = { api: { GET: mockGET }, report: () => {} };
jest.mock('@/services/ServicesProvider', () => ({ useAppServices: () => mockServices, useUnits: () => 'METRIC' }));

async function show() {
  await render(
    <ThemeProvider scheme="light">
      <WhatIfScreen />
    </ThemeProvider>,
  );
  await act(async () => {});
}

test('each example week and what the rules would call, said to be example data', async () => {
  await show();
  expect(mockGET).toHaveBeenCalledWith('/v1/decisions/{id}/what-if', { params: { path: { id: 'd1' } } });
  expect(screen.getByText(t('whatIf.example'))).toBeOnTheScreen();
  expect(screen.getByText([t('whatIf.trend.FLAT'), t('whatIf.adherence.ON_TRACK'), t('whatIf.training.HOLDING')].join(' · '))).toBeOnTheScreen();
  expect(screen.getByText(t('decision.adjust_calories.not_toward_goal.title'))).toBeOnTheScreen();
});

test('not read, or no consent: one line', async () => {
  mockAnswer = 'offline';
  await show();
  expect(screen.getByText(t('whatIf.failed'))).toBeOnTheScreen();
  mockAnswer = refused(403, 'CONSENT_REQUIRED');
  await show();
  expect(screen.getByText(t('today.consent.body'))).toBeOnTheScreen();
});
