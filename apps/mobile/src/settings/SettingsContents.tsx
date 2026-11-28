import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import type { NotificationPermission } from '@/notifications/reminders';
import { useAppearance, useAppServices, useLanguage, useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { load } from '@/today/today';
import { useReadOnFocus } from '@/today/useReadOnFocus';

import { contentsLines } from './contentsLines';
import { remindersOn } from './RemindersSection';
import { openSection, SECTIONS, sectionTitle } from './sections';

/** iOS's answer on notifications, read on arrival and each time the app comes back to the front (the way back from iOS Settings). */
function useNotificationPermission(): NotificationPermission | null {
  const { reminders } = useAppServices();
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  useEffect(() => {
    let live = true;
    const read = () =>
      reminders.permission().then(
        (answer) => live && setPermission(answer),
        () => undefined,
      );
    void read();
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && void read());
    return () => {
      live = false;
      subscription.remove();
    };
  }, [reminders]);
  return permission;
}

/**
 * Settings as contents (K-1257, ADR-094 Ek 9): nine chapters on the paper, each a serif name over a muted line of what it holds
 * today, split by a hairline, with a chevron; a press opens the chapter's page. The reads are the ones the groups made here
 * before (the program, the profile, the subscription), again whenever Settings comes into view, so a change made on a page shows
 * on return. The line wraps, never cut.
 */
export function SettingsContents() {
  const { api, reminders } = useAppServices();
  const { color } = useTheme();
  const read = useCallback(async () => {
    const [program, profile, subscription] = await Promise.all([
      load(() => api.GET('/v1/program')),
      load(() => api.GET('/v1/profile')),
      load(() => api.GET('/v1/subscription')),
    ]);
    return { program, profile, subscription };
  }, [api]);
  const { data } = useReadOnFocus(read);
  const settings = useSyncExternalStore(reminders.subscribe, reminders.current);
  const permission = useNotificationPermission();
  const lines = contentsLines({
    ...(data ?? {}),
    remindersOn: permission === null ? null : remindersOn(settings, permission),
    appearance: useAppearance(),
    language: useLanguage(),
    units: useUnits(),
  });
  return (
    <View>
      {SECTIONS.map((section, index) => {
        const title = sectionTitle(section);
        const line = lines[section];
        return (
          <Pressable
            key={section}
            accessibilityRole="button"
            accessibilityLabel={line === '' ? title : `${title}, ${line}`}
            onPress={() => openSection(section)}
            style={({ pressed }) => [styles.row, index > 0 && { borderTopWidth: tokens.border.hairline, borderTopColor: color.line }, pressed && styles.pressed]}>
            <View style={styles.texts}>
              <Text style={[styles.title, { color: color.text }]}>{title}</Text>
              {line !== '' && <Text style={[styles.line, { color: color.muted }]}>{line}</Text>}
            </View>
            <Icon name="chevron.right" size="small" tone="muted" />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space.md, paddingVertical: tokens.space.md, minHeight: tokens.size.row },
  texts: { flex: 1, minWidth: 0, gap: tokens.space.xs },
  title: { ...tokens.face.display, fontSize: tokens.type.heading },
  line: { fontSize: tokens.type.bodySmall },
  pressed: { opacity: tokens.opacity.dim },
});
