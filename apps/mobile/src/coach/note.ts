/**
 * The week's short coach note (K-517, L3 Y8): the call's own words, its leading rule's sentence (K-522), and the week's one
 * focus. Always a template (ADR-043: the model writes nothing the user reads), out of the quota, nothing sent — every
 * number in it is one the call holds, as it holds it (U1). A safety call says nothing of why (ADR-028 #24).
 */
import type { components } from '@/api/schema';
import { has } from '@/copy';

import type { Line } from './conversation';

type Decision = components['schemas']['Decision'];

export function weeklyNote(decision: Decision): Line[] {
  const lines: Line[] = [{ key: `${decision.copyKey}.title` }];
  const lead = decision.reasons[0];
  if (decision.safety !== true && lead !== undefined && has(`decision.rule.${lead.rule}`)) lines.push({ key: `decision.rule.${lead.rule}` });
  lines.push(focus(decision));
  return lines;
}

/**
 * The week's one focus, from the kind of call — its numbers as the call holds them, said as the change itself (true before
 * and after it is applied). A safety call arrives as a change of phase: its focus is the pause's, never "building" (U6).
 * A change taken back is said to be.
 */
function focus(decision: Decision): Line {
  if (decision.safety === true) return { key: 'coach.note.focus.hard_stop' };
  // Declined (last week's plan kept, K-963) is not applied either: the plan stays as it was, as after an undo.
  if (decision.application.state === 'UNDONE' || decision.application.state === 'DECLINED') return { key: 'coach.note.focus.undone' };
  const { action } = decision;
  const key = `coach.note.focus.${action.type.toLowerCase()}`;
  switch (action.type) {
    case 'ADJUST_CALORIES':
      return { key: `${key}.${action.kcalPerDay < 0 ? 'less' : 'more'}`, values: { kcal: String(Math.abs(action.kcalPerDay)) } };
    case 'INCREASE_CALORIES':
      return { key, values: { kcal: String(Math.abs(action.kcalPerDay)) } };
    case 'DELOAD':
      return { key, values: { percent: String(Math.round(action.setsFactor * 100)) } };
    case 'MINI_CUT':
      return { key, values: { min: String(action.minWeeks), max: String(action.maxWeeks) } };
    case 'CHANGE_PHASE':
      return { key: `${key}.${action.to.toLowerCase()}` };
    default:
      return { key };
  }
}
