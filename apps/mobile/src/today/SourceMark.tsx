import { SymbolView, type SFSymbol } from 'expo-symbols';
import { View } from 'react-native';

import type { components } from '@/api/schema';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/** One symbol for each kind of source: coaching experience, research, a rule of the app (U14). */
const SYMBOL: Record<components['schemas']['SourceTag'], SFSymbol> = {
  EXPERIENCE: 'person.fill',
  LITERATURE: 'book',
  PRODUCT: 'gearshape',
};

/**
 * A reason's kind of source as a symbol instead of a line of words (the call's word budget, ADR-077 #3); VoiceOver
 * hears the full words ("From research"), so the kind of source stays said for everyone (U14).
 */
export function SourceMark({ tag }: { tag: components['schemas']['SourceTag'] }) {
  const { color } = useTheme();
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={t(`today.call.source.${tag}`)}>
      <SymbolView name={SYMBOL[tag]} size={tokens.type.body} tintColor={color.muted} />
    </View>
  );
}
