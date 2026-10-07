/**
 * The welcome's example calls (prototype #welcome): the kind of call the app makes each Monday, one at a time in the
 * decision block. They turn once, each shown for welcome_example_ms, and rest on the first: no endless motion. With
 * Reduce Motion on, the first stays. Never "2 days, not 3": the engine does not propose fewer than three days
 * (ADR-071 #8).
 */
import { useEffect, useState } from 'react';

import { DecisionBlock } from '@/components/DecisionBlock';
import { t } from '@/copy';
import { useReduceMotion } from '@/theme/useReduceMotion';

import { onboardingParams } from './params';

export const EXAMPLE_CALLS = [
  'welcome.examples.hold',
  'welcome.examples.rep',
  'welcome.examples.lighter',
  'welcome.examples.eat',
] as const;

export function ExampleCalls() {
  const reduce = useReduceMotion();
  // How many turns have been taken; after a full round, the first shows again and they rest.
  const [turns, setTurns] = useState(0);
  useEffect(() => {
    if (reduce || turns >= EXAMPLE_CALLS.length) return;
    const next = setTimeout(() => setTurns((taken) => taken + 1), onboardingParams.welcomeExampleMs);
    return () => clearTimeout(next);
  }, [reduce, turns]);
  const shown = reduce ? EXAMPLE_CALLS[0] : EXAMPLE_CALLS[turns % EXAMPLE_CALLS.length];
  return <DecisionBlock eyebrow={t('welcome.examplesLabel')} title={t(shown)} />;
}
