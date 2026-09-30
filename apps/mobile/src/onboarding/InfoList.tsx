import { StyleSheet, Text, View } from 'react-native';

import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/** The information steps' points: a bold line and what it means, from copy keys `<prefix>.<item>.title|body`. */
export function InfoList({ prefix, items }: { prefix: string; items: string[] }) {
  const { color } = useTheme();
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <View key={item} style={[styles.item, { borderTopColor: color.line }]}>
          <Text style={[styles.title, { color: color.text }]}>{t(`${prefix}.${item}.title`)}</Text>
          <Text style={[styles.body, { color: color.textSecondary }]}>{t(`${prefix}.${item}.body`)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: tokens.space.md },
  item: { borderTopWidth: tokens.border.hairline, paddingTop: tokens.space.md, gap: tokens.space.xs },
  title: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  body: { fontSize: tokens.type.body },
});
