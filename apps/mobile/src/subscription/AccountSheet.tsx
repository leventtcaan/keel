/**
 * The account behind the paywall's "Account" button (paywall v2, ADR-072 Ek 3, ADR-058 107; App Review 5.1.1(v)): export, delete
 * and sign out, reachable without paying, in a sheet over the plans. The list is Settings' own (ADR-070 Ek 2 #2): the title on
 * the left, "Done" as a text button on the right, then the same Account group with its one line about deleting.
 */
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Button } from '@/components/Button';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { AccountSection } from '@/settings/AccountSection';
import { useReduceMotion } from '@/theme/useReduceMotion';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/** The header's "Account" pill (prototype `.acct`): a person and the word. */
export function AccountButton({ onPress }: { onPress: () => void }) {
  const { color } = useTheme();
  const line = { stroke: color.text, strokeWidth: 2, strokeLinecap: 'round', fill: 'none' } as const;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('subscription.account')}
      onPress={onPress}
      style={[styles.pill, { backgroundColor: color.background }]}>
      <Svg width={ICON} height={ICON} viewBox="0 0 24 24" accessible={false}>
        <Circle cx={12} cy={8} r={3.6} {...line} />
        <Path d="M5 20c.8-4 3.6-6 7-6s6.2 2 7 6" {...line} />
      </Svg>
      <Text style={[styles.pillText, { color: color.text }]}>{t('subscription.account')}</Text>
    </Pressable>
  );
}

export function AccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { color } = useTheme();
  const reduceMotion = useReduceMotion();
  if (!visible) return null;
  return (
    <Modal animationType={reduceMotion ? 'none' : 'slide'} presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.sheet}>
          <View style={styles.head}>
            <ScreenTitle>{t('subscription.account')}</ScreenTitle>
            <Button label={t('subscription.accountDone')} variant="text" onPress={onClose} />
          </View>
          <AccountSection footer={t('settings.account.footer')} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const ICON = 20;
const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.xs + 2, minHeight: tokens.size.touch, borderRadius: tokens.size.touch / 2, paddingHorizontal: tokens.space.md },
  pillText: { fontSize: tokens.type.buttonSmall, fontWeight: tokens.weight.bold },
  safe: { flex: 1 },
  sheet: { padding: tokens.space.lg, gap: tokens.space.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space.md },
});
