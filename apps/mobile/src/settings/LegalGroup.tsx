import { Linking, StyleSheet, View } from 'react-native';

import { ListGroup, ListRow } from '@/components/ListGroup';
import { ProblemText } from '@/components/ProblemText';
import { t } from '@/copy';
import { configuredLegalLinks } from '@/subscription/links';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { useAction } from './useAction';

/**
 * Settings › Legal (K-1062): the Privacy Policy and the Terms of Use, which a signed-in user could find only on the paywall
 * and the sign-in screen. The same addresses (EXPO_PUBLIC_PRIVACY_URL, EXPO_PUBLIC_TERMS_URL; subscription/links.ts); each is a
 * row that opens the page in the browser, and one the build has no https address for is left out, never a dead link.
 */
export function LegalGroup() {
  const { color } = useTheme();
  const { problem, run } = useAction();
  const links = configuredLegalLinks();
  if (links.length === 0) return null;
  const open = (url: string) => void run(() => Linking.openURL(url).then(() => undefined), {}, 'settings.sources.failed');
  return (
    <View style={styles.stack}>
      <ListGroup title={t('settings.legal.title')} testID="group-legal">
        {links.map((link) => (
          <ListRow
            key={link.key}
            icon={link.key === 'subscription.privacy' ? 'hand.raised' : 'doc.text'}
            label={t(link.key)}
            trailing="arrow.up.right"
            accessibilityHint={link.url}
            onPress={() => open(link.url)}
          />
        ))}
      </ListGroup>
      {problem !== null && <ProblemText style={[styles.note, { color: color.text }]}>{problem}</ProblemText>}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space.sm },
  note: { fontSize: tokens.type.bodySmall },
});
