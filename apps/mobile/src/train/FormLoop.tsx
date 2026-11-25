import { VideoView, type VideoSource, useVideoPlayer } from 'expo-video';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

type Props = {
  source: VideoSource;
  /** Already translated: what a screen reader says the clip shows. */
  label: string;
};

/** Said in code, not text: the player's settings and the view's fit. */
const MIX: 'mixWithOthers' = 'mixWithOthers';
const CONTAIN: 'contain' = 'contain';

/**
 * One repetition drawn as nine frames and played in a loop (ADR-091 Ek 6): silent, and mixed with whatever the user is
 * listening to, so the gym music never stops. It moves for longer than five seconds, so it can be paused (WCAG 2.2.2);
 * the screen shows the still form image instead when Reduce Motion is on, and this is not mounted at all then.
 */
export function FormLoop({ source, label }: Props) {
  const { color } = useTheme();
  const [playing, setPlaying] = useState(true);
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
    p.audioMixingMode = MIX;
    p.play();
  });

  function toggle() {
    if (playing) player.pause();
    else player.play();
    setPlaying(!playing);
  }

  return (
    <View testID="form-loop" style={styles.frame}>
      <VideoView
        player={player}
        nativeControls={false}
        contentFit={CONTAIN}
        allowsPictureInPicture={false}
        accessible
        accessibilityRole="image"
        accessibilityLabel={label}
        style={StyleSheet.absoluteFill}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(playing ? 'demo.loopPause' : 'demo.loopPlay')}
        onPress={toggle}
        hitSlop={tokens.space.sm}
        style={[styles.toggle, { backgroundColor: color.surface, borderColor: color.edge }]}
      >
        <Icon name={playing ? 'pause.fill' : 'play.fill'} size="small" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', aspectRatio: 1, borderRadius: tokens.radius.chip, overflow: 'hidden' },
  toggle: {
    position: 'absolute',
    right: tokens.space.sm,
    bottom: tokens.space.sm,
    width: tokens.size.touch,
    height: tokens.size.touch,
    borderRadius: tokens.size.touch / 2,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
