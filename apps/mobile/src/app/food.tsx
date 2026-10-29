import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { ProblemText } from '@/components/ProblemText';
import { ScreenTitle } from '@/components/ScreenTitle';
import { t } from '@/copy';
import { CopyDay } from '@/food/CopyDay';
import { DayStrip } from '@/food/DayStrip';
import { DayTotals } from '@/food/DayTotals';
import { copiedAt, changeMeal, deleteMeal, deletedMeal, deletedMeals, logMealAgain, removedItem, requestsOfMeal } from '@/food/mealActions';
import { dayTitle, eatenAtFor } from '@/food/dayLabel';
import { MealList, RepeatOffers } from '@/food/MealList';
import { foodParams } from '@/food/params';
import { emptySlotsOf, perMealKcal } from '@/food/slots';
import { savedMeal } from '@/food/savedMeal';
import { Suggestions } from '@/food/Suggestions';
import { TargetsCard } from '@/food/TargetsCard';
import { useFoodDay } from '@/food/useFoodDay';
import { useSaved } from '@/saved/saved';
import { useAppServices } from '@/services/ServicesProvider';
import { newClientId } from '@/sync/send';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { load } from '@/today/today';

type Schemas = components['schemas'];

/**
 * The food of a day (K-409, K-407, K-1063; a page, ADR-086): the day navigator on top — chevrons and a strip of the last month — then
 * what the day came to as single numbers (ADR-090 #5), the day's meals with each item's amount (tap to change it where it stands,
 * swipe to delete, Undo in the banner), and the way to log into the day shown, past ones too. "Same as yesterday" and "Copy a day's
 * meals" are one tap away. The AI is off on this surface (ADR-069 #3, K-909). Health data: without the consent, one line and the way
 * to Settings; nothing is logged and nothing kept on the phone without it (ADR-030 #25).
 */
export default function FoodScreen() {
  const { color } = useTheme();
  const { api, queue, consents, report, forgetRecord, takeBack } = useAppServices();
  const saved = useSaved();
  const [selected, setSelected] = useState<string | null>(null);
  const { today, day, data: read, reload } = useFoodDay(selected);
  // Reads of another day than the one shown are not shown (the new day's read is on its way).
  const data = read !== null && read.day === day ? read : null;
  const [working, setWorking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  // Offers logged since this read: hidden until the next read lands (it shows their meal), so a second tap on a slow network cannot
  // log the same meal twice — each tap is a new clientId, which the server cannot tell apart. Kept with the read they belong to.
  const [repeated, setRepeated] = useState<{ read: typeof data; ids: ReadonlySet<string> }>({ read: null, ids: new Set() });
  const hidden = repeated.read === data ? repeated.ids : new Set<string>();
  const busy = useRef(false); // two presses in the same moment must not log twice

  const services = { api, queue, forgetRecord, report };
  const named = (error: unknown) => report({ name: error instanceof Error ? error.name : 'Unknown' });
  const guarded = async (run: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    setWorking(true);
    setProblem(null);
    try {
      await run();
    } catch (error) {
      named(error);
      setProblem(t('food.repeat.failed'));
    } finally {
      busy.current = false;
      setWorking(false);
      reload();
    }
  };

  const repeat = (meal: Schemas['Meal']) =>
    guarded(async () => {
      // The consent as the phone knows it: withdrawn in Settings since this list was read, nothing is kept.
      if (!(await consents.granted('HEALTH_DATA'))) return setProblem(t('food.repeat.noConsent'));
      const clientId = newClientId();
      await queue.record({ kind: 'meal', body: { clientId, eatenAt: eatenAtFor(day, meal.slot, new Date()), slot: meal.slot, repeatOf: meal.id } });
      setRepeated((before) => ({ read: data, ids: new Set(before.read === data ? before.ids : []).add(meal.id) }));
    });

  const needsConnection = () => setProblem(t('meal.edit.needsConnection'));

  const deleteWhole = (meal: Schemas['Meal']) =>
    guarded(async () => {
      const result = await deleteMeal(services, meal);
      if (result === 'done') saved(deletedMeal(services, meal, reload));
      else if (result === 'offline') needsConnection();
      else setProblem(t('food.deleted.failed'));
    });

  // A slot's menu: every log of the slot goes, and one Undo puts them all back. A log already gone stays gone if another fails.
  const deleteSlot = (logs: Schemas['Meal'][]) =>
    guarded(async () => {
      const gone: Schemas['Meal'][] = [];
      let failure: 'offline' | 'failed' | null = null;
      for (const meal of logs) {
        const result = await deleteMeal(services, meal);
        if (result === 'done') gone.push(meal);
        else {
          failure = result;
          break;
        }
      }
      if (gone.length > 0) saved(deletedMeals(services, gone, reload));
      if (failure === 'offline') needsConnection();
      else if (failure === 'failed') setProblem(t('food.deleted.failed'));
    });

  const deleteItem = (meal: Schemas['Meal'], index: number) => {
    // The last item of a meal is the meal.
    if (meal.items.length === 1) return deleteWhole(meal);
    return guarded(async () => {
      const result = await changeMeal(api, meal.id, { items: requestsOfMeal(meal).filter((_, i) => i !== index) });
      if (result.state === 'done') saved(removedItem(services, meal, meal.items[index].name, reload));
      else if (result.state === 'offline') needsConnection();
      else setProblem(t('food.deleted.failed'));
    });
  };

  const logToday = (logs: Schemas['Meal'][]) =>
    guarded(async () => {
      if (!(await consents.granted('HEALTH_DATA'))) return setProblem(t('food.repeat.noConsent'));
      const ids: string[] = [];
      for (const meal of logs) ids.push(await logMealAgain(services, meal, new Date().toISOString()));
      if (ids.length === 1) return saved(savedMeal({ clientId: ids[0], slot: logs[0].slot, items: logs[0].items.length }, { api, takeBack, report }));
      saved({ detail: t('food.copy.saved', { count: ids.length }), undo: undoAll(ids) });
    });

  /** Takes back every meal logged by one action (its clientIds), as one Undo. */
  const undoAll = (ids: string[]) => async () => {
    try {
      for (const clientId of ids) {
        await takeBack(clientId, async (id) => (await api.DELETE('/v1/meals/{id}', { params: { path: { id } } })).response.status);
      }
      reload();
      return { done: true as const, said: t('meal.quick.undoneSaid') };
    } catch (error) {
      named(error);
      return { done: false as const, message: t('meal.quick.undoFailed'), again: true };
    }
  };

  const copyDay = (source: Schemas['DaySummary']) =>
    guarded(async () => {
      if (!(await consents.granted('HEALTH_DATA'))) return setProblem(t('food.repeat.noConsent'));
      const meals = await load(() => api.GET('/v1/meals', { params: { query: { day: source.day } } }));
      if (meals.state !== 'ready') return setProblem(t('food.copy.failed'));
      const now = new Date();
      const ids: string[] = [];
      for (const meal of meals.value) ids.push(await logMealAgain(services, meal, copiedAt(meal, day, today, now)));
      setCopying(false);
      saved({
        lead: t('food.copy.lead'),
        detail: t('food.copy.saved', { count: ids.length }),
        undo: undoAll(ids),
      });
    });

  const needsConsent = data !== null && (data.budget.state === 'consent' || data.targets.state === 'consent' || data.meals === null);
  const failed = data !== null && (data.budget.state === 'failed' || data.targets.state === 'failed' || (data.meals !== null && !data.mealsRead));
  const isToday = day === today;
  const loggedSlots = data?.meals?.map((row) => (row.kind === 'sent' ? row.meal.slot : row.slot)) ?? [];
  const slots = data?.slots ?? [];
  // Only from the user's own pattern: the first days' slots are a guess from one or two meals, not a habit (K-1066).
  const perMeal = data !== null && data.budget.state === 'ready' && data.patternDays >= foodParams.mealHintMinDays ? perMealKcal(data.budget.value.targetKcal, slots.length) : null;
  const hint = perMeal === null ? null : t('food.totals.hint', { count: slots.length, kcal: perMeal.toLocaleString('en-US') });
  const noTarget = data !== null && data.budget.state === 'none' && data.summary === undefined && isToday;

  const retry = failed ? (
    <View style={styles.note}>
      <Text style={[styles.text, { color: color.textSecondary }]}>{t('today.failed')}</Text>
      <Button label={t('today.retry')} variant="ghost" size="sm" onPress={reload} />
    </View>
  ) : null;
  const consent = needsConsent ? (
    <View style={styles.note}>
      <Text style={[styles.text, { color: color.textSecondary }]}>{t('food.consent')}</Text>
      <Button label={t('today.consent.open')} variant="ghost" size="sm" onPress={() => router.push('/settings')} />
    </View>
  ) : null;
  const totals =
    data === null || needsConsent ? null : (
      <DayTotals budget={data.budget} targets={data.targets} {...(data.summary === undefined ? {} : { summary: data.summary })} hint={hint} />
    );
  const noBudget = noTarget ? <Text style={[styles.text, { color: color.textSecondary }]}>{t('food.budget.none')}</Text> : null;
  const targets = data !== null && isToday && data.targets.state === 'ready' ? <TargetsCard targets={data.targets.value} /> : null;
  const meals =
    data !== null && data.meals !== null ? (
      <MealList
        meals={data.meals}
        complete={data.mealsRead}
        isToday={isToday}
        emptySlots={data.mealsRead ? emptySlotsOf(slots, loggedSlots) : []}
        onEditItem={(meal, index) => router.push({ pathname: '/meal', params: { edit: meal.id, day, item: String(index) } })}
        onDeleteItem={(meal, index) => void deleteItem(meal, index)}
        onDeleteSlot={(logs) => void deleteSlot(logs)}
        onAdd={(slot) => router.push({ pathname: '/meal', params: { day, slot } })}
        {...(isToday ? {} : { onLogToday: (logs: Schemas['Meal'][]) => void logToday(logs) })}
      />
    ) : null;
  const offered = data === null ? [] : data.offers.filter((meal) => !hidden.has(meal.id));
  const offers =
    offered.length > 0 ? (
      <RepeatOffers title={t(isToday ? 'food.repeat.title' : 'food.repeat.titleDay')} offers={offered} busy={working} onRepeat={(meal) => void repeat(meal)} />
    ) : null;
  const copy =
    data === null || needsConsent ? null : copying ? (
      <CopyDay days={data.summaries} into={day} today={today} busy={working} onCopy={(source) => void copyDay(source)} onClose={() => setCopying(false)} />
    ) : (
      <Button label={t('food.copy.open')} variant="text" size="sm" onPress={() => setCopying(true)} />
    );

  return (
    <SafeAreaView testID="screen" style={[styles.safe, { backgroundColor: color.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenTitle>{dayTitle(day, today)}</ScreenTitle>
        <DayStrip day={day} today={today} logged={data?.loggedDays ?? new Set<string>()} onChange={(next) => setSelected(next === today ? null : next)} />
        {retry}
        {consent}
        {totals}
        {noBudget}
        {!needsConsent && data !== null && (
          <Button label={t(isToday ? 'food.log' : 'food.logDay')} onPress={() => router.push({ pathname: '/meal', params: { day } })} />
        )}
        {meals}
        {offers}
        {copy}
        {problem !== null && <ProblemText style={[styles.text, { color: color.text }]}>{problem}</ProblemText>}
        {!needsConsent && data !== null && isToday && <Suggestions suggestions={data.suggestions} />}
        {targets}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: tokens.space.lg, gap: tokens.space.md },
  note: { gap: tokens.space.sm },
  text: { fontSize: tokens.type.body },
});
