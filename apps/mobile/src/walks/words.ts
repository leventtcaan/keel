/** The walk line's words (K-1216): the copy in data/copy/en.json, the numbers from the suggestion. Nothing blames, nothing asks to make up for anything (U7). */
import { t } from '@/copy';
import { formatNumber } from '@/copy/format';

import type { Suggestion } from './suggest';

const num = (n: number) => formatNumber(Math.round(n));

/** The line on the first screen: the steps left, and the route and back, or the minutes. */
export function walkLine(remaining: number, suggestion: Suggestion): string {
  const steps = num(remaining);
  return suggestion.kind === 'route'
    ? t('walks.line.route', { steps, name: suggestion.route.name })
    : t('walks.line.minutes', { steps, minutes: suggestion.minutes });
}

/** The same, as a whole sentence for a screen reader and for the evening notification. */
export function walkLabel(remaining: number, suggestion: Suggestion): string {
  const steps = num(remaining);
  return suggestion.kind === 'route'
    ? t('walks.label.route', { steps, name: suggestion.route.name, minutes: suggestion.minutes })
    : t('walks.label.minutes', { steps, minutes: suggestion.minutes });
}
