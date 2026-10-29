/**
 * A move's icon (prototype `thumb`): what it is lifted with, as a system symbol in a tile, and nothing else (ADR-070 Ek 2
 * #3). It says the equipment class the catalog gives (barbell, dumbbell, machine, cable, plate-loaded, body weight), and
 * where the catalog says none (an own move, a catalog not yet read) there is no icon at all, not a guessed bar. Decorative:
 * the move's name is beside it, so VoiceOver passes over it.
 */
import type { SFSymbol } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import type { components } from '@/api/schema';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Equipment = components['schemas']['Equipment'];

/**
 * One symbol per class. SF Symbols has no bar, so the barbell is the system's own "traditional strength training" figure
 * (the bar overhead); the others are things, not people: a cable fly is not a squatting figure.
 */
const SYMBOL: Record<Equipment, SFSymbol> = {
  BARBELL: 'figure.strengthtraining.traditional',
  DUMBBELL: 'dumbbell',
  MACHINE: 'gearshape',
  CABLE: 'cable.connector',
  PLATE_LOADED: 'circle.circle',
  BODYWEIGHT: 'figure.core.training',
};

export function MoveThumb({ equipment }: { equipment: Equipment | undefined }) {
  const { color } = useTheme();
  if (equipment === undefined) return null;
  return (
    <View
      testID={`move-thumb-${equipment}`}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.tile, { backgroundColor: color.surface }]}>
      <Icon name={SYMBOL[equipment]} />
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
