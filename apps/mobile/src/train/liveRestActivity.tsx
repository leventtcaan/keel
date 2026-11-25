/**
 * The rest as a Live Activity (K-1215): what the lock screen and the Dynamic Island draw. This file imports the native packages
 * at its top, so only `liveRest.ts` reads it, lazily and inside a try: a build without the module never loads it (K-1026).
 * The layout function is one of `expo-widgets`' own: Babel turns it into a string that the widget extension runs, so it can
 * use nothing from this file but the swift-ui names (the extension has them as globals) and its props. Every word and the
 * accent colour come in as props from the copy file and the theme (K2). The clock is the system's own `Text(timerInterval:)`:
 * it counts by itself, so nothing updates it each second; the app updates the activity only when the rest changes.
 */
import { Button, HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, frame, monospacedDigit } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity } from 'expo-widgets';

import type { RestLiveProps } from './liveRest';

export const restActivity = createLiveActivity<RestLiveProps>('KeelRest', (props) => {
  'widget';
  const range = { lower: new Date(props.since), upper: new Date(props.endsAt) };
  const clock = (size: number, width?: number) => (
    <Text
      timerInterval={range}
      countsDown
      modifiers={[font({ size, weight: 'semibold' }), monospacedDigit(), foregroundStyle(props.accent), ...(width ? [frame({ width })] : [])]}
    />
  );
  const lines = (
    <VStack alignment="leading" spacing={2}>
      <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle({ type: 'hierarchical', style: 'primary' })]}>{props.title}</Text>
      <Text modifiers={[font({ size: 14 }), foregroundStyle({ type: 'hierarchical', style: 'secondary' })]}>{props.next}</Text>
    </VStack>
  );
  const actions = (
    <HStack spacing={12}>
      <Button label={props.less} target="less" />
      <Button label={props.more} target="more" />
      <Spacer />
      <Button label={props.ready} target="ready" />
    </HStack>
  );
  return {
    banner: (
      <VStack alignment="leading" spacing={8}>
        <HStack>
          {lines}
          <Spacer />
          {clock(34)}
        </HStack>
        {actions}
      </VStack>
    ),
    compactLeading: <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(props.accent)]}>{props.label}</Text>,
    compactTrailing: clock(14, 48),
    minimal: clock(11, 36),
    expandedLeading: lines,
    expandedTrailing: clock(26, 80),
    expandedBottom: actions,
  };
});
