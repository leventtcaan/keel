/**
 * "What would change the call" (K-610, L3 Y3, prototype 5.6): the server's example weeks in words — the "if" is the
 * week's three choices, the "then" the call the rules make of it, by its own title. Nothing is decided here (U1).
 */
import type { components } from '@/api/schema';
import { t } from '@/copy';

type WhatIf = components['schemas']['WhatIf'];

export type WhatIfRow = { when: string; then: string };

export function whatIfRows(whatIf: WhatIf): WhatIfRow[] {
  return whatIf.scenarios.map(({ when, decision }) => ({
    when: [t(`whatIf.trend.${when.trend}`), t(`whatIf.adherence.${when.adherence}`), t(`whatIf.training.${when.training}`)].join(' · '),
    then: t(`${decision.copyKey}.title`),
  }));
}
