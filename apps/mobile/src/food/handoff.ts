/**
 * A meal the coach read (K-509) or a photo's (K-408), handed to the meal screen: in memory and once — never in a link, where the words a user
 * eats would sit in a URL (V3). The meal screen looks at it while it is built (a pure read: React may build it twice) and
 * clears it once it is on screen, so the next meal starts empty.
 */
export type HandedMeal = { foodId: string; name: string; quantity: number; unit: string }[];

/** Where it came from: a photo's grams are by eye, and the meal screen says why it asks for them. */
export type HandedFrom = 'coach' | 'photo';

let handed: HandedMeal | null = null;
let handedBy: HandedFrom | null = null;

export function handOffMeal(items: HandedMeal, from: HandedFrom = 'coach'): void {
  handed = items;
  handedBy = from;
}

export function handedFrom(): HandedFrom | null {
  return handedBy;
}

export function peekMeal(): HandedMeal | null {
  return handed;
}

export function clearMeal(): void {
  handed = null;
  handedBy = null;
}

/** Look and clear at once. */
export function takeMeal(): HandedMeal | null {
  const taken = handed;
  clearMeal();
  return taken;
}
