import { Linking, StyleSheet, View } from 'react-native';

import { ListGroup, ListRow } from '@/components/ListGroup';
import { ProblemText } from '@/components/ProblemText';
import { t } from '@/copy';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

import { openDetail } from './detail';
import { useAction } from './useAction';

/**
 * Settings › Data sources (ADR-088 #3, ODbL): the row on Settings names the food data in one line and opens the page that
 * credits each source. The credit is the licence's: what the data is, who made it, under what terms, with the link.
 */
export function DataSourcesGroup() {
  return (
    <ListGroup title={t('settings.sources.title')} testID="group-sources">
      <ListRow icon="fork.knife" label={t('settings.sources.food')} value={t('settings.sources.foodValue')} navigates onPress={() => openDetail('sources')} />
    </ListGroup>
  );
}

/** One source, as it is credited: its name, its terms in one line, and the links, each a row that opens the address. */
const SOURCES = [
  { id: 'usda', links: [{ labelKey: 'settings.sources.website', valueKey: 'settings.sources.usda.site', urlKey: 'settings.sources.usda.url' }] },
  {
    id: 'off',
    links: [
      { labelKey: 'settings.sources.website', valueKey: 'settings.sources.off.site', urlKey: 'settings.sources.off.url' },
      { labelKey: 'settings.sources.license', valueKey: 'settings.sources.off.licenseName', urlKey: 'settings.sources.off.licenseUrl' },
    ],
  },
] as const;

/** The page: USDA FoodData Central (public domain) and Open Food Facts (ODbL), each with its terms and its links. */
export function DataSourcesPage() {
  const { color } = useTheme();
  const { problem, run } = useAction();
  const open = (url: string) => void run(() => Linking.openURL(url).then(() => undefined), {}, 'settings.sources.failed');
  return (
    <View style={styles.stack}>
      {SOURCES.map((source) => (
        <ListGroup key={source.id} title={t(`settings.sources.${source.id}.name`)} footer={t(`settings.sources.${source.id}.note`)} testID={`source-${source.id}`}>
          {source.links.map((link) => (
            <ListRow
              key={link.urlKey}
              icon="link"
              label={t(link.labelKey)}
              value={t(link.valueKey)}
              onPress={() => open(t(link.urlKey))}
              accessibilityHint={t(link.urlKey)}
            />
          ))}
        </ListGroup>
      ))}
      {problem !== null && <ProblemText style={[styles.note, { color: color.text }]}>{problem}</ProblemText>}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space.xl },
  note: { fontSize: tokens.type.bodySmall },
});
