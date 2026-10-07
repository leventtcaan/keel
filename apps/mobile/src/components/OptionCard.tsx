import { Pressable, StyleSheet, Text, View } from 'react-native';

import { InverseSurface, useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Props = {
  /** Already translated. */
  title: string;
  /** A line on what the answer means, when it needs one. */
  body?: string;
  /** A short mark above the title, e.g. "Recommended". */
  tag?: string;
  /** The answer the app recommends: drawn as the decision block (prototype `.opt.hero`). */
  hero?: boolean;
  selected: boolean;
  onPress: () => void;
};

/**
 * One answer of a single-choice question (prototype `.opt`). A radio for screen readers: its words are read together,
 * and whether it is the one chosen. The recommended answer stands out as a block; chosen, it gets the accent's ring.
 */
export function OptionCard({ title, body, tag, hero = false, selected, onPress }: Props) {
  const { color } = useTheme();
  const label = [title, tag, body].filter((part) => part !== undefined).join(', ');
  const ring = hero
    ? { backgroundColor: color.decisionBackground, borderColor: selected ? color.accent : color.decisionBackground }
    : { backgroundColor: color.surface, borderColor: selected ? color.text : color.surface };
  const content = <Content title={title} body={body} tag={tag} hero={hero} selected={selected} />;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.card, hero && styles.hero, ring]}>
      {hero ? <InverseSurface>{content}</InverseSurface> : content}
    </Pressable>
  );
}

function Content({ title, body, tag, hero, selected }: Required<Pick<Props, 'title' | 'hero' | 'selected'>> & Pick<Props, 'body' | 'tag'>) {
  const { color } = useTheme();
  return (
    <>
      {tag !== undefined && (
        <Text style={[styles.tag, { backgroundColor: color.accent, color: color.onAccent }]}>{tag}</Text>
      )}
      <View style={styles.row}>
        <Text style={[hero ? styles.heroTitle : styles.title, { color: color.text }]}>{title}</Text>
        <View style={[styles.dot, { borderColor: selected ? color.accent : color.muted }]}>
          {selected && <View style={[styles.fill, { backgroundColor: color.accent }]} />}
        </View>
      </View>
      {body !== undefined && <Text style={[styles.body, { color: color.muted }]}>{body}</Text>}
    </>
  );
}

const DOT = 20;
const styles = StyleSheet.create({
  card: {
    borderRadius: tokens.radius.option,
    borderWidth: tokens.border.outline,
    padding: tokens.space.md,
    gap: tokens.space.xs,
    minHeight: tokens.size.touch,
    justifyContent: 'center',
  },
  hero: { padding: tokens.space.lg, gap: tokens.space.sm, borderWidth: tokens.border.ring },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: tokens.space.sm },
  title: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold, flexShrink: 1 },
  heroTitle: { fontFamily: tokens.font.display, fontSize: tokens.type.decisionTitle, flexShrink: 1 },
  body: { fontSize: tokens.type.bodySmall },
  tag: {
    alignSelf: 'flex-start',
    borderRadius: tokens.radius.chip,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs,
    fontSize: tokens.type.label,
    fontWeight: tokens.weight.bold,
    overflow: 'hidden',
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: tokens.border.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: { width: DOT / 2, height: DOT / 2, borderRadius: DOT / 4 },
});
