import type { components } from '@/api/schema';
import { Card } from '@/components/Card';
import type { UnitSystem } from '@/units/units';
import type { WalkRead } from '@/walks/read';

import { FoodLine } from './FoodLine';
import { TodayNumbers } from './TodayNumbers';
import { type WeightRead, proteinNumber, stepsNumber, weightNumber } from './numbers';
import type { Loaded } from './today';

type Schemas = components['schemas'];

type Props = {
  budget: Loaded<Schemas['DayBudget']>;
  targets: Loaded<Schemas['Targets']>;
  /** Today's steps as Apple Health counts them; null when Health was not read. */
  stepsToday?: number | null;
  /** The starting plan's targets, read only before the first call (the steps target then). */
  starting?: Loaded<Schemas['StartingTarget']>;
  weight?: WeightRead;
  /** The steps left as a walk (K-1216); none, nothing is shown. */
  walk?: WalkRead | null;
  units: UnitSystem;
};

/**
 * Today's numbers, in one card high on This week (K-1206): the food line (what is left, "Log"), and under it protein, steps and the
 * weight trend. At most four numbers. Where the food line has no budget to show (no consent, none, not read), the other numbers
 * stand in a card of their own; none to show, none drawn.
 */
export function TodayBlock({ budget, targets, starting, stepsToday, weight, walk = null, units }: Props) {
  const numbers = <TodayNumbers protein={proteinNumber(budget)} steps={stepsNumber(targets, starting, stepsToday)} weight={weightNumber(weight, units)} walk={walk} units={units} />;
  const empty = proteinNumber(budget) === null && stepsNumber(targets, starting, stepsToday) === null && weightNumber(weight, units) === null;
  if (budget.state === 'ready') return <FoodLine budget={budget} footer={numbers} />;
  return (
    <>
      <FoodLine budget={budget} />
      {empty ? null : <Card>{numbers}</Card>}
    </>
  );
}
