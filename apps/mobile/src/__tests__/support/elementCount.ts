/**
 * Counts what a screen asks the eye and the thumb to take in (K-1207, the founder's "too much on screen"): the audit's way, one
 * count per discrete text and per button. The rule, so a number means the same thing before and after:
 * - a text (a host Text with words) is one; a button (an accessible pressable) is one, its label inside it is not counted again;
 * - a field (TextInput) is one;
 * - a `unit` is one however many parts it has: the session's bar (End, time, Pause: chrome that is the same in every state),
 *   the move dots (one progress picture), a stepper (a number with its two buttons) and the reps-left row (one optional answer);
 * - what a person cannot see or reach (hidden from accessibility, opacity 0) is not counted.
 * `raw` counts the same screen with no unit: every dot, every button of a stepper, every chip.
 */
import type { ReactTestRendererJSON } from 'react-test-renderer';

type Node = ReactTestRendererJSON | string;

export const UNITS = ['session-header', 'move-dots', 'stepper-box', 'rir-row'];

export type Count = { count: number; labels: string[] };

function textOf(node: Node): string {
  if (typeof node === 'string') return node;
  return (node.children ?? []).map(textOf).join('');
}

function hidden(props: Record<string, unknown>): boolean {
  if (props.accessibilityElementsHidden === true || props.importantForAccessibility === 'no-hide-descendants') return true;
  const style = ([] as unknown[]).concat(props.style ?? []).flat(Infinity) as ({ opacity?: number } | false | null | undefined)[];
  return style.some((s) => typeof s === 'object' && s !== null && s.opacity === 0);
}

function isButton(props: Record<string, unknown>): boolean {
  return props.accessibilityRole === 'button' || props.role === 'button';
}

export function countElements(root: Node | Node[] | null, units: boolean): Count {
  const labels: string[] = [];
  const walk = (node: Node): void => {
    if (typeof node === 'string') return;
    const props = (node.props ?? {}) as Record<string, unknown>;
    if (hidden(props)) return;
    const id = typeof props.testID === 'string' ? props.testID : null;
    if (units && id !== null && UNITS.includes(id)) {
      labels.push(`[${id}]`);
      return;
    }
    if (node.type === 'Text') {
      const words = textOf(node).trim();
      if (words !== '') labels.push(words);
      return;
    }
    if (node.type === 'TextInput') {
      labels.push(`[field ${String(props.accessibilityLabel ?? '')}]`);
      return;
    }
    if (isButton(props)) {
      labels.push(`[button ${String(props.accessibilityLabel ?? textOf(node))}]`);
      return;
    }
    for (const child of node.children ?? []) walk(child);
  };
  for (const node of Array.isArray(root) ? root : root === null ? [] : [root]) walk(node);
  return { count: labels.length, labels };
}
