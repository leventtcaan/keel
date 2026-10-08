/**
 * A move's image (prototype `thumb`): what it is lifted with, as a system symbol in a tile. Decorative — the move's name
 * is beside it — so VoiceOver passes over it. A move the catalog does not know (or an own move) gets the bar.
 */
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import type { components } from '@/api/schema';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Equipment = components['schemas']['Equipment'];

const SYMBOL: Record<Equipment, SymbolViewProps['name']> = {
  BARBELL: 'figure.strengthtraining.traditional',
  DUMBBELL: 'dumbbell.fill',
  MACHINE: 'gearshape.fill',
  CABLE: 'figure.strengthtraining.functional',
  PLATE_LOADED: 'circle.circle',
  BODYWEIGHT: 'figure.core.training',
};

export function MoveThumb({ equipment }: { equipment: Equipment | undefined }) {
  const { color } = useTheme();
  return (
    <View
      testID={`move-thumb-${equipment ?? 'BARBELL'}`}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.tile, { backgroundColor: color.surface }]}>
      <SymbolView name={SYMBOL[equipment ?? 'BARBELL']} size={tokens.type.heading} tintColor={color.text} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: tokens.size.touch,
    height: tokens.size.touch,
    borderRadius: tokens.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
