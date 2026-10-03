import type { components } from '@/api/schema';
import type { UnitSystem } from '@/units/units';

export type BasisRow = { label: string; value: string };

export function basisRows(_basis: components['schemas']['DecisionBasis'], _units: UnitSystem): BasisRow[] {
  return [];
}
