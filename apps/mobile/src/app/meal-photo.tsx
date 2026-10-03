import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { DraftPicks, anyMatched } from '@/food/DraftPicks';
import { handOffMeal, type HandedMeal } from '@/food/handoff';
import { readMealPhoto, type PhotoRead, type PhotoSource } from '@/food/photo';
import { photoTools } from '@/food/photoTools';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';

/** Where the screen is: the consent asked about, ready to take one, reading it, or what came back. */
type Step = { at: 'checking' } | { at: 'consent' } | { at: 'choose'; note: 'denied' | 'failed' | null } | { at: 'reading' } | { at: 'draft'; read: Extract<PhotoRead, { state: 'ready' }> };

/**
 * A meal from a photo (K-408, ADR-046). The AI consent first: without it, why and the way to Settings — nothing is
 * taken. With it, what happens to the photo, then the camera or the library; the photo is shrunk on the phone and sent
 * (photo.ts), and what comes back is the server's draft: each food seen with "about N g" and the database's foods to
 * pick (DraftPicks), one tap each. Then the meal screen with the picks — in memory, never in a link (V3) — where the
 * range and its one gram question are the database's (U1, U5), with why a photo needs the gram.
 */
export default function MealPhotoScreen() {
  const { api, consents } = useAppServices();
  const { color } = useTheme();
  const [step, setStep] = useState<Step>({ at: 'checking' });

  useEffect(() => {
    // Not known (a failing keychain) is not given.
    void consents
      .granted('THIRD_PARTY_AI')
      .catch(() => false)
      .then((granted) => setStep(granted ? { at: 'choose', note: null } : { at: 'consent' }));
  }, [consents]);

  const take = async (source: PhotoSource) => {
    setStep({ at: 'reading' });
    const read = await readMealPhoto({ api, consents }, photoTools, source);
    if (read.state === 'ready') return setStep({ at: 'draft', read });
    if (read.state === 'consent') return setStep({ at: 'consent' });
    setStep({ at: 'choose', note: read.state === 'cancelled' ? null : read.state });
  };
  const log = (items: HandedMeal) => {
    handOffMeal(items, 'photo');
    router.replace('/meal');
  };
  const line = (key: string) => <Text style={[styles.text, { color: color.text }]}>{t(key)}</Text>;

  let body: React.ReactNode = null;
  if (step.at === 'consent') {
    body = (
      <View style={styles.part}>
        {line('mealPhoto.consent')}
        <Button label={t('today.consent.open')} variant="ghost" onPress={() => router.push('/settings')} />
      </View>
    );
  } else if (step.at === 'choose') {
    body = (
      <View style={styles.part}>
        <Text style={[styles.text, { color: color.textSecondary }]}>{t('mealPhoto.intro')}</Text>
        {step.note !== null && line(`mealPhoto.${step.note}`)}
        <Button label={t('mealPhoto.camera')} onPress={() => void take('camera')} />
        <Button label={t('mealPhoto.library')} variant="ghost" onPress={() => void take('library')} />
      </View>
    );
  } else if (step.at === 'reading') {
    body = line('mealPhoto.reading');
  } else if (step.at === 'draft') {
    const { draft } = step.read;
    body = (
      <View style={styles.part}>
        {draft.items.length === 0 ? (
          line('mealPhoto.unread')
        ) : (
          <DraftPicks draft={draft} describe={(item) => t('mealPhoto.item', { food: item.food, quantity: String(item.amount.quantity) })} onLog={log} />
        )}
        <ByName shown={!anyMatched(draft)} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: color.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{t('mealPhoto.title')}</ScreenTitle>
        {body}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Nothing the database knows in it: the meal screen, by name. */
function ByName({ shown }: { shown: boolean }) {
  if (!shown) return null;
  return <Button label={t('coach.meal.byName')} variant="ghost" onPress={() => router.replace('/meal')} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.lg },
  part: { gap: tokens.space.md },
  text: { fontSize: tokens.type.body },
});
