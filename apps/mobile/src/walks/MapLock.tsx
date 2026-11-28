import { SandLock } from '@/components/SandLock';
import { t } from '@/copy';

/** Where the map would be, without a subscription (K-1251, ADR-094 Ek 6): the sand lock group with the map's line. */
export function MapLock() {
  return <SandLock line={t('walks.today.locked')} />;
}
