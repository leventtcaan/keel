/**
 * The app icon, small (paywall v2 header, ADR-072 Ek 3): the black tile with the turquoise N and the white square dot, drawn from
 * the approved icon's own shapes (docs/magaza/icon/options/opt6.svg, 1024 units). Always these colours, in dark mode too: it is
 * the icon, not a themed control. Decorative: the name beside it is what a screen reader says.
 */
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { palettes, tokens } from '@/theme/tokens';

const ICON = 1024;
const N =
  'M491.34 202H629.51Q635.71 202 639.26 205.54Q642.8 209.09 642.8 215.29V808.71Q642.8 814.91 639.26 818.46Q635.71 822 629.51 822H471.86Q460.34 822 457.69 810.49L390.37 542.11Q389.49 539.46 386.83 539.46Q384.17 539.46 384.17 543L385.94 808.71Q385.94 814.91 382.4 818.46Q378.86 822 372.66 822H234.49Q228.29 822 224.74 818.46Q221.2 814.91 221.2 808.71V215.29Q221.2 209.09 224.74 205.54Q228.29 202 234.49 202H390.37Q401.89 202 404.54 213.51L472.74 482.77Q473.63 486.31 476.29 486.31Q478.94 486.31 478.94 482.77L478.06 215.29Q478.06 209.09 481.6 205.54Q485.14 202 491.34 202Z';

export function BrandMark() {
  const icon = palettes.light;
  return (
    <View testID="brand-mark" accessible={false} style={styles.tile}>
      <Svg width={tokens.size.brandMark} height={tokens.size.brandMark} viewBox={`0 0 ${ICON} ${ICON}`} accessible={false}>
        <Rect width={ICON} height={ICON} fill={icon.decisionBackground} />
        <Path d={N} fill={icon.accentInk} />
        <Rect x={676} y={672} width={150} height={150} fill={icon.decisionText} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { width: tokens.size.brandMark, height: tokens.size.brandMark, borderRadius: tokens.radius.chip, overflow: 'hidden' },
});
