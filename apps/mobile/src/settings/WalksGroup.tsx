import { useSyncExternalStore } from 'react';

import { ListGroup, ListRow } from '@/components/ListGroup';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';

import { openDetail } from './detail';

/**
 * The Activity page's second part (K-1216): "My walks", the walks the user really takes, which the home screen uses to say what the steps left
 * come to. The row says how many are saved and opens the page where they are added and removed. Kept on the phone only.
 */
export function WalksGroup() {
  const { walks } = useAppServices();
  const kept = useSyncExternalStore(walks.subscribe, walks.current);
  return (
    <ListGroup testID="group-walks-entry">
      <ListRow
        icon="figure.walk.motion"
        label={t('settings.walks.title')}
        value={kept.length === 0 ? t('settings.walks.none') : t('settings.walks.count', { count: kept.length })}
        navigates
        onPress={() => openDetail('walks')}
      />
    </ListGroup>
  );
}
