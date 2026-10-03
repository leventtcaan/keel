import { StyleSheet, Text } from 'react-native';

import type { components } from '@/api/schema';
import { Card } from '@/components/Card';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { firstWeeksSay } from './firstWeeks';
import type { Loaded } from './today';

/**
 * The first eight weeks on Today (K-521, I1 F2): this week's words (none in week one) and, in a risky week, one message in a
 * human voice — no blame, nothing to make up (U7). Not read, or past the flow: nothing.
 */
export function FirstWeeksCard({ read, previousOpen, day }: { read: Loaded<components['schemas']['FirstWeeks']> | undefined; previousOpen: string | null; day: string }) {
  const { color } = useTheme();
  if (read?.state !== 'ready') return null;
  const said = firstWeeksSay(read.value, previousOpen, day);
  if (said.content === undefined && !said.risk) return null;
  return (
    <Card testID="first-weeks">
      {said.content !== undefined && <Text style={[styles.title, { color: color.text }]}>{t(`${said.content}.title`)}</Text>}
      {said.content !== undefined && <Text style={[styles.text, { color: color.textSecondary }]}>{t(`${said.content}.body`)}</Text>}
      {said.risk && <Text style={[styles.text, { color: color.text }]}>{t('first_weeks.risk')}</Text>}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  text: { fontSize: tokens.type.body },
});
