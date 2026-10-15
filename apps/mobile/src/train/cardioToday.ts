/**
 * Which cardio is today's (K-980, ADR-074 Ek 2): what "+ > Cardio" shows instead of asking again. The server's `loggedToday`
 * (the typed record if there is one, the watch's when that is all there is) and what this phone holds that the server may
 * not have yet. A typed record is what can be taken back, so it comes first, from whichever side has it; Apple Health's
 * record is shown and stays. A copy of the program kept for offline (`kept`) does not say what was done today — it was
 * the server's word on some earlier day — so then only this phone's own records count. Read online with the program's
 * cardio, the server's list is the truth (as the meals': meals.ts): a record kept here as sent that the list does not hold
 * was deleted elsewhere, so only a record still waiting to be sent counts besides it.
 */
import type { components } from '@/api/schema';
import type { LocalRecord } from '@/sync/store';

type Schemas = components['schemas'];

export type TodaysCardio =
  | { kind: 'none' }
  /** `serverId`: the server's id for it when the server's read gave it; else taking it back goes by `clientId` alone. */
  | { kind: 'typed'; clientId: string; minutes: number; serverId?: string }
  | { kind: 'health'; minutes: number; activeEnergyKcal?: number };

export function todaysCardio({
  program,
  kept,
  records,
  day,
}: {
  program: Schemas['Program'] | null;
  kept: boolean;
  records: LocalRecord[];
  day: string;
}): TodaysCardio {
  const logged = kept ? undefined : program?.cardio?.loggedToday;
  if (logged !== undefined && logged.source === 'MANUAL') {
    return { kind: 'typed', clientId: logged.clientId, minutes: logged.minutes, serverId: logged.id };
  }
  const listRead = !kept && program?.cardio !== undefined;
  const own = records.find((r) => {
    if (r.kind !== 'cardio' || r.state === 'REJECTED') return false;
    if (listRead && r.state !== 'PENDING') return false;
    const body = r.body as Schemas['NewCardioSession'];
    return body.day === day && body.source === 'MANUAL';
  });
  if (own !== undefined) return { kind: 'typed', clientId: own.clientId, minutes: (own.body as Schemas['NewCardioSession']).minutes };
  if (logged !== undefined) {
    return { kind: 'health', minutes: logged.minutes, ...(logged.activeEnergyKcal === undefined ? {} : { activeEnergyKcal: logged.activeEnergyKcal }) };
  }
  return { kind: 'none' };
}
