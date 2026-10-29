import { useCallback } from 'react';

import { ListGroup, ListRow } from '@/components/ListGroup';
import { loadConsents, type PhoneConsentStatus } from '@/consent/consents';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useReadOnFocus } from '@/today/useReadOnFocus';

import { openDetail } from './detail';

/** What a consent row says: its state in a word. Not read (offline, still on its way) is no word, never a guess. */
function stateWord(status: PhoneConsentStatus | undefined, read: boolean): string {
  if (!read) return '';
  if (status === 'GRANTED') return t('settings.consents.allowed');
  if (status === 'OUTDATED') return t('settings.consents.outdatedShort');
  return t('settings.consents.notAllowed');
}

/** A row that cannot be opened is still a (disabled) button, so a screen reader finds it and hears why. */
const locked = () => undefined;

/**
 * Settings › Health and data (K-982, ADR-007, ADR-018; a grouped list, ADR-070 Ek 2 #2): four rows, each opening the page that
 * holds the controls and their texts, so none is lost and none is long under a row. The two consents come first, always
 * (they are how the import unlocks), each saying Allowed or Not allowed, and open their text, Allow and Withdraw; Add to
 * Apple Health (the write switches) is apart from the read consent (ADR-018 §1, Ek 1: what a switch added stays yours to
 * stop even after the consent is withdrawn); the weigh-in import reads health data, so without the health data consent its
 * row is locked and says why. The workout file import is a Training row, not here. Read whenever Settings comes into view,
 * so a consent changed on its page shows on return.
 */
export function HealthGroup({ granted }: { granted: boolean | null }) {
  const { api } = useAppServices();
  const read = useCallback(() => loadConsents(api).then((found) => ({ found }), () => null), [api]);
  const { data } = useReadOnFocus(read);
  const known = data !== null && data !== undefined;
  const states = known ? data.found : {};
  // Built before the JSX: a literal inside a JSX child is read as text by the copy guard (copy-literals.test.ts).
  const importRow =
    granted === false ? (
      <ListRow icon="scalemass" label={t('settings.import.title')} value={t('settings.health.needsConsent')} onPress={locked} disabled />
    ) : (
      <ListRow icon="scalemass" label={t('settings.import.title')} navigates onPress={() => openDetail('import')} />
    );
  return (
    <ListGroup title={t('settings.health.title')} testID="group-health">
      <ListRow
        icon="lock"
        label={t('settings.health.consent')}
        value={stateWord(states.HEALTH_DATA, known)}
        navigates
        onPress={() => openDetail('consent')}
      />
      <ListRow
        icon="heart"
        label={t('settings.consents.APPLE_HEALTH')}
        value={stateWord(states.APPLE_HEALTH, known)}
        navigates
        onPress={() => openDetail('apple')}
      />
      <ListRow icon="heart.text.square" label={t('settings.healthWrite.title')} navigates onPress={() => openDetail('write')} />
      {importRow}
    </ListGroup>
  );
}
