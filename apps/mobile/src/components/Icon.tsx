import { type SFSymbol, SymbolView } from 'expo-symbols';

import { useTheme } from '@/theme/theme';
import { type Palette, tokens } from '@/theme/tokens';

type Props = {
  /** An SF Symbol name ("scalemass"); the app's icons are SF Symbols only (ADR-070 Ek 2 #3). */
  name: SFSymbol;
  /** Two sizes, one weight: `regular` 24 pt, `small` 20 pt. */
  size?: 'small' | 'regular';
  /** Which colour of the palette, ink by default (named `tone` so a palette key is not mistaken for a colour literal, K2). */
  tone?: keyof Palette;
  /**
   * Already translated. Only an icon that says something no text beside it says needs one; an icon next to its label is
   * decorative and stays hidden from a screen reader, so the same thing is not read twice.
   */
  label?: string;
  testID?: string;
};

/** An SF Symbol at the app's one weight (medium) and one of its two sizes, coloured from the theme. */
export function Icon({ name, size = 'regular', tone = 'text', label, testID }: Props) {
  const { color } = useTheme();
  return (
    <SymbolView
      name={name}
      size={tokens.icon[size]}
      weight={tokens.icon.weight}
      tintColor={color[tone]}
      testID={testID}
      {...(label === undefined ? { accessible: false } : { accessible: true, accessibilityRole: 'image', accessibilityLabel: label })}
    />
  );
}
