import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { MapLock } from './MapLock';
import { useMapAccess } from './mapAccess';
import { WalkMapScreen } from './WalkMapScreen';

/**
 * The walk map behind its subscription (K-1251, ADR-094 Ek 6): the map screen with one, the lock without. Nothing is drawn while the server
 * is asked; an answer that cannot be read is said, not taken for a lock.
 */
export function PaidWalkMapScreen() {
  const { api } = useAppServices();
  const { color } = useTheme();
  const access = useMapAccess(api);
  if (access === 'open') return <WalkMapScreen />;
  let body = null;
  if (access === 'locked') body = <MapLock />;
  else if (access === 'unread') body = <Text style={[styles.note, { color: color.text }]}>{t('walks.today.mapUnread')}</Text>;
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{t('walkMap.title')}</ScreenTitle>
        {body}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.lg },
  note: { fontSize: tokens.type.bodySmall },
});
