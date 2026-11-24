import { ListGroup, ListRow } from '@/components/ListGroup';
import { t } from '@/copy';

import { openDetail } from './detail';

/**
 * Settings › Coach (ADR-092): one row to the page that holds the AI consent, what the coach remembers about the user and the
 * conversation. The words stay on that page, none under the row (ADR-070 Ek 2 #2).
 */
export function CoachGroup() {
  return (
    <ListGroup title={t('settings.coach.title')} testID="group-coach">
      <ListRow icon="bubble.left" label={t('settings.coach.row')} navigates onPress={() => openDetail('coach')} />
    </ListGroup>
  );
}
