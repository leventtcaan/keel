import type { SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FitText } from '@/components/FitText';
import { Icon } from '@/components/Icon';
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
  /** An SF Symbol in a tile before the words (prototype `.oi`); decoration, so the answer is still named by its words. */
  icon?: SFSymbol;
  selected: boolean;
  /** Can't be chosen now (an answer on its way); shown dimmed. */
  disabled?: boolean;
  onPress: () => void;
};

/**
 * One answer of a single-choice question (prototype `.opt`). A radio for screen readers: its words are read together,
 * and whether it is the one chosen. The recommended answer stands out as a block; chosen, it gets the accent's ring.
 */
export function OptionCard({ title, body, tag, hero = false, icon, selected, disabled = false, onPress }: Props) {
  const { color } = useTheme();
  const label = [title, tag, body].filter((part) => part !== undefined).join(', ');
  const ring = hero
    ? { backgroundColor: color.decisionBackground, borderColor: selected ? color.accent : color.decisionBackground }
    : { backgroundColor: color.surface, borderColor: selected ? color.text : color.surface };
  const content = <Content title={title} body={body} tag={tag} hero={hero} icon={icon} selected={selected} />;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.card, hero && styles.hero, ring, disabled && styles.dim]}>
      {hero ? <InverseSurface>{content}</InverseSurface> : content}
    </Pressable>
  );
}

function Content({ title, body, tag, hero, icon, selected }: Required<Pick<Props, 'title' | 'hero' | 'selected'>> & Pick<Props, 'body' | 'tag' | 'icon'>) {
  const { color } = useTheme();
  const words = (
    <View style={[styles.words, icon !== undefined && styles.beside]}>
      {tag !== undefined && (
        <View style={[styles.tag, { backgroundColor: color.accent }]}>
          <FitText style={[styles.tagText, { color: color.onAccent }]}>{tag}</FitText>
        </View>
      )}
      <View style={styles.row}>
        <Text style={[hero ? styles.heroTitle : styles.title, { color: color.text }]}>{title}</Text>
        <View style={[styles.dot, { borderColor: selected ? color.accent : color.muted }]}>
          {selected && <View style={[styles.fill, { backgroundColor: color.accent }]} />}
        </View>
      </View>
      {body !== undefined && <Text style={[styles.body, { color: color.muted }]}>{body}</Text>}
    </View>
  );
  if (icon === undefined) return words;
  return (
    <View style={styles.withIcon}>
      <View testID="option-icon" style={[styles.tile, { backgroundColor: color.background }]}>
        <Icon name={icon} />
      </View>
      {words}
    </View>
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
  dim: { opacity: tokens.opacity.dim },
  hero: { padding: tokens.space.lg, gap: tokens.space.sm, borderWidth: tokens.border.ring },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: tokens.space.sm },
  words: { gap: tokens.space.xs },
  /** Beside the icon's tile: takes the rest of the row. */
  beside: { flex: 1 },
  withIcon: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md },
  tile: { width: tokens.size.optionIcon, height: tokens.size.optionIcon, borderRadius: tokens.radius.button, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold, flexGrow: 1, flexShrink: 1 },
  heroTitle: { fontFamily: tokens.font.display, fontSize: tokens.type.decisionTitle, flexGrow: 1, flexShrink: 1 },
  body: { fontSize: tokens.type.bodySmall },
  tag: {
    alignSelf: 'flex-start',
    borderRadius: tokens.radius.chip,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs,
    overflow: 'hidden',
  },
  tagText: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
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
