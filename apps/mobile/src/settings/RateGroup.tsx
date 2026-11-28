import { Linking } from 'react-native';

import { ListGroup, ListRow } from '@/components/ListGroup';
import { t } from '@/copy';
import { writeReviewUrl } from '@/review/deviceStoreReview';
import { reviewParams } from '@/review/reviewPrompt';

/**
 * Settings › Rate the app (K-1254, ADR-095 #3): one row that opens the App Store's write-review page — the persistent link
 * StoreKit allows in settings, never Apple's prompt from a tap. Without the app's page in the build (app.config.ts ›
 * ios.appStoreUrl) there is no row, never a dead link.
 */
export function RateGroup() {
  const url = writeReviewUrl(reviewParams.writeReviewQuery);
  if (url === null) return null;
  return (
    <ListGroup testID="group-rate">
      <ListRow icon="star" label={t('settings.rate.row')} trailing="arrow.up.right" accessibilityHint={t('settings.rate.hint')} onPress={() => void Linking.openURL(url).catch(() => undefined)} />
    </ListGroup>
  );
}
