import { router } from 'expo-router';

import { ListGroup, ListRow } from '@/components/ListGroup';
import { t } from '@/copy';

import { useGuide } from './GuideProvider';

/**
 * Settings › How it works (K-1065): one row that shows the first-use guide again. Settings is a screen over the tabs, so the way
 * to the guide is back to This week, which opens it as it comes into view.
 */
export function GuideGroup() {
  const guide = useGuide();
  const show = () => {
    guide.request();
    router.dismissTo('/');
  };
  return (
    <ListGroup testID="group-guide">
      <ListRow icon="questionmark.circle" label={t('settings.guide.row')} navigates onPress={show} />
    </ListGroup>
  );
}
