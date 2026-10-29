import { Children, createContext, type ReactNode, useContext } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import type { SFSymbol } from 'expo-symbols';

import { Icon } from '@/components/Icon';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/** Whether the row being drawn is the first in its group (it has no line above it); a row outside a group has none either. */
const FirstRow = createContext(true);

type GroupProps = {
  /** The section title: small, semibold, ink (not grey), above the card. Already translated. */
  title?: string;
  /** One muted line under the card at most; longer explanations belong on a page of their own (ADR-070 Ek 2 #2). */
  footer?: string;
  children: ReactNode;
  testID?: string;
};

/** A section of a grouped list: a title, then one surface card whose rows are split by a hairline (ADR-070 Ek 2 #2). */
export function ListGroup({ title, footer, children, testID }: GroupProps) {
  const { color } = useTheme();
  // Built outside the JSX children (the raw-text guard reads them).
  const heading = title === undefined ? null : (
    <Text accessibilityRole="header" style={[styles.title, { color: color.text }]}>
      {title}
    </Text>
  );
  const cardId = testID === undefined ? undefined : `${testID}-card`;
  return (
    <View testID={testID} style={styles.group}>
      {heading}
      <View testID={cardId} style={[styles.card, { backgroundColor: color.surface }]}>
        {Children.toArray(children).map((child, index) => (
          <FirstRow.Provider key={index} value={index === 0}>
            {child}
          </FirstRow.Provider>
        ))}
      </View>
      {footer !== undefined && <Text style={[styles.footer, { color: color.muted }]}>{footer}</Text>}
    </View>
  );
}

type RowProps = {
  /** Already translated. */
  label: string;
  /** Left of the label; decorative (the label says it). */
  icon?: SFSymbol;
  /** On the right, muted. */
  value?: string;
  /** The row is a button. */
  onPress?: () => void;
  /** The press opens another page: only then the chevron shows. A row that acts in place (a sheet, an alert) has none. */
  navigates?: boolean;
  /** Starts a destructive action: the warning colour, icon and label. */
  destructive?: boolean;
  /** A switch row (not a button): the row is the label and the switch. */
  switch?: { value: boolean; onValueChange: (value: boolean) => void };
  /** What a screen reader says when the label is short for it; the switch is named by it. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
  testID?: string;
};

/** The line starts under the label, past the icon and its gap; a row with no icon starts at its own padding. */
const INSET_PAST_ICON = tokens.space.md + tokens.icon.regular + tokens.space.md;

/** One row of a ListGroup: icon, label, value, and a chevron, a switch or nothing at the end. */
export function ListRow({ label, icon, value, onPress, navigates = false, destructive = false, switch: toggle, accessibilityLabel, accessibilityHint, disabled = false, testID }: RowProps) {
  const { color } = useTheme();
  const first = useContext(FirstRow);
  const ink = destructive ? color.warn : color.text;
  const tone = destructive ? 'warn' : 'text';
  // Built outside the JSX children (the raw-text guard reads them).
  const separator = first ? null : (
    <View
      testID={testID === undefined ? undefined : `${testID}-separator`}
      style={[styles.separator, { backgroundColor: color.line, left: icon === undefined ? tokens.space.md : INSET_PAST_ICON }]}
    />
  );
  const chevron =
    onPress !== undefined && navigates ? <Icon name="chevron.right" size="small" tone="muted" testID={testID === undefined ? undefined : `${testID}-chevron`} /> : null;
  const body = (
    <>
      {separator}
      {icon !== undefined && <Icon name={icon} tone={tone} />}
      <Text style={[styles.label, { color: ink }]}>{label}</Text>
      {value !== undefined && <Text style={[styles.value, { color: color.muted }]}>{value}</Text>}
      {toggle !== undefined && (
        <Switch
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={accessibilityHint}
          value={toggle.value}
          onValueChange={toggle.onValueChange}
          disabled={disabled}
          trackColor={{ false: color.edge, true: color.accent }}
          ios_backgroundColor={color.edge}
        />
      )}
      {chevron}
    </>
  );
  if (onPress === undefined || toggle !== undefined) {
    // Read as one: "Version, 1.0". A switch row is not accessible as a whole, or the switch could not be reached.
    return (
      <View
        testID={testID}
        {...(toggle === undefined ? { accessible: true, accessibilityLabel: value === undefined ? label : `${label}, ${value}` } : {})}
        style={styles.row}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (value === undefined ? label : `${label}, ${value}`)}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, (pressed || disabled) && styles.dim]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { gap: tokens.space.sm },
  title: { marginLeft: tokens.space.xs, fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
  card: { borderRadius: tokens.radius.card, overflow: 'hidden' },
  footer: { marginHorizontal: tokens.space.xs, fontSize: tokens.type.label },
  row: {
    minHeight: tokens.size.row,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
  },
  separator: { position: 'absolute', top: 0, right: 0, height: tokens.border.hairline },
  label: { flex: 1, minWidth: 0, fontSize: tokens.type.body },
  value: { fontSize: tokens.type.bodySmall },
  dim: { opacity: tokens.opacity.dim },
});
