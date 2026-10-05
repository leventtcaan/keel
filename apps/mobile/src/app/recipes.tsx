import { router } from 'expo-router';
import { type ReactNode, useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProblemText } from '@/components/ProblemText';
import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { Confirm } from '@/settings/Confirm';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { load } from '@/today/today';
import { useReadOnFocus } from '@/today/useReadOnFocus';

type Recipe = components['schemas']['Recipe'];

/**
 * Your recipes (K-423, ADR-034): each with how many portions it makes and the range per portion the database gives now
 * (U1, U5 — the server estimates on every read). One whose ingredient the database dropped is marked: it cannot be
 * logged until entered again, and can be deleted. Deleting asks first; meals that logged it keep what they logged.
 * Read whenever the screen comes into view, so a recipe just entered is there. Health data: without the consent the
 * server says so (403), and the screen says where to give it.
 */
export default function RecipesScreen() {
  const { api, report } = useAppServices();
  const { color } = useTheme();
  const read = useCallback(() => load(() => api.GET('/v1/recipes')), [api]);
  const { data, reload } = useReadOnFocus(read);
  const [asking, setAsking] = useState<Recipe | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const deleting = useRef(false); // two taps at once must not delete twice

  const remove = async (recipe: Recipe) => {
    if (deleting.current) return;
    deleting.current = true;
    setBusy(true);
    setProblem(null);
    try {
      const { response } = await api.DELETE('/v1/recipes/{id}', { params: { path: { id: recipe.id } } });
      // Already gone counts as deleted.
      if (!response.ok && response.status !== 404)
        throw Object.assign(new Error(`delete failed with HTTP ${response.status}`), { name: 'DeleteFailed' });
      setAsking(null);
      reload();
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      setAsking(null);
      setProblem(t('recipes.deleteFailed'));
    } finally {
      deleting.current = false;
      setBusy(false);
    }
  };

  const body =
    data === null ? null : data.state === 'consent' ? (
      <>
        <Text style={[styles.text, { color: color.text }]}>{t('recipes.consent')}</Text>
        <Button label={t('recipes.openSettings')} variant="ghost" size="sm" onPress={() => router.push('/settings')} />
      </>
    ) : data.state === 'failed' ? (
      <>
        <Text style={[styles.text, { color: color.text }]}>{t('recipes.failed')}</Text>
        <Button label={t('recipes.retry')} variant="ghost" size="sm" onPress={reload} />
      </>
    ) : (
      <RecipeList
        recipes={data.state === 'ready' ? data.value : []}
        onDelete={setAsking}
        busy={busy}
        // The question sits with the recipe it is about: an inline step at the end of a long list would be off-screen.
        asking={
          asking === null ? null : (
            <Confirm
              title={t('recipes.confirmTitle', { name: asking.name })}
              body={t('recipes.confirmBody')}
              confirmLabel={t('recipes.confirm')}
              keepLabel={t('recipes.keep')}
              onConfirm={() => void remove(asking)}
              onKeep={() => setAsking(null)}
              busy={busy}
            />
          )
        }
        askingId={asking?.id ?? null}
      />
    );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={tokens.space.md}>
          <Text style={[styles.text, { color: color.text }]}>{t('recipes.back')}</Text>
        </Pressable>
        <ScreenTitle>{t('recipes.title')}</ScreenTitle>
        {body}
        {problem !== null && <ProblemText style={[styles.text, { color: color.text }]}>{problem}</ProblemText>}
        <Button label={t('recipes.new')} onPress={() => router.push('/recipe')} />
      </ScrollView>
    </SafeAreaView>
  );
}

type ListProps = { recipes: Recipe[]; onDelete: (recipe: Recipe) => void; busy: boolean; asking: ReactNode; askingId: string | null };

function RecipeList({ recipes, onDelete, busy, asking, askingId }: ListProps) {
  const { color } = useTheme();
  if (recipes.length === 0) return <Text style={[styles.text, { color: color.muted }]}>{t('recipes.none')}</Text>;
  return (
    <View>
      {recipes.map((recipe) => (
        <View key={recipe.id} testID={`recipe-${recipe.id}`}>
          <View style={[styles.row, { borderColor: color.line }]}>
            <View style={styles.words}>
              <Text style={[styles.name, { color: color.text }]}>{recipe.name}</Text>
              <Text style={[styles.small, { color: color.muted }]}>
                {t(`recipes.makes.${recipe.portions === 1 ? 'one' : 'other'}`, { portions: recipe.portions })}
              </Text>
              <PortionLine recipe={recipe} />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('recipes.deleteSpoken', { name: recipe.name })}
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={() => onDelete(recipe)}
              hitSlop={tokens.space.sm}>
              <Text style={[styles.small, { color: color.text }]}>{t('recipes.delete')}</Text>
            </Pressable>
          </View>
          {askingId === recipe.id && asking}
        </View>
      ))}
    </View>
  );
}

/** The range per portion, as the database gives it now; none when an ingredient is gone (ADR-034 #6). */
function PortionLine({ recipe }: { recipe: Recipe }) {
  const { color } = useTheme();
  const unavailable = (recipe.unavailable ?? []).length > 0 || recipe.perPortion === undefined;
  if (unavailable) return <Text style={[styles.small, { color: color.text }]}>{t('recipes.unavailable')}</Text>;
  const kcal = recipe.perPortion?.kcal;
  return kcal === undefined ? null : (
    <Text style={[styles.small, { color: color.muted }]}>{t('recipes.perPortion', { low: kcal.low, high: kcal.high })}</Text>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
    paddingVertical: tokens.space.sm,
    borderBottomWidth: tokens.border.hairline,
  },
  words: { flex: 1, gap: tokens.space.xs },
  name: { fontSize: tokens.type.body, fontWeight: tokens.weight.semibold },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
