import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { components } from '@/api/schema';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ProblemText } from '@/components/ProblemText';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { useAppServices } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { parseNumber } from '@/units/units';

import { foodParams } from './params';

type Schemas = components['schemas'];

type Props = {
  /** The barcode that was not found: kept with the food, so the scanner finds it next time. */
  gtin?: string;
  /** The words the search had, as a start for the name. */
  initialName?: string;
  onCancel: () => void;
  onCreated: (food: Schemas['Food']) => void;
};

type Field = 'name' | 'serving' | 'kcal' | 'protein' | 'carbs' | 'fat';

/** A number typed: empty is none, anything that is not 0 or more is wrong (null). */
function amount(text: string): number | null | 'empty' {
  if (text.trim() === '') return 'empty';
  const value = parseNumber(text);
  return value !== null && value >= 0 ? value : null;
}

/**
 * A food of the user's own (K-1063): for a product the database does not have, typed from its label — the name, the serving's
 * weight, and the label's calories, protein, carbs and fat for that serving. The barcode that was not found rides along. It becomes
 * a food like any (search, barcode, estimate, favorites) that only this user sees, and is added to the meal on its serving.
 */
export function OwnFoodForm({ gtin, initialName = '', onCancel, onCreated }: Props) {
  const { api, report } = useAppServices();
  const { color } = useTheme();
  const [name, setName] = useState(initialName);
  const [serving, setServing] = useState(String(foodParams.ownFoodServingG));
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false); // two taps at once must not make two foods

  const save = async () => {
    if (saving.current) return;
    const grams = amount(serving);
    const energy = amount(kcal);
    const [p, c, f] = [amount(protein), amount(carbs), amount(fat)];
    // A macro left empty is none (0); the name, the serving and the calories are the label's first lines.
    if (name.trim() === '' || grams === 'empty' || grams === null || grams <= 0 || energy === 'empty' || energy === null || p === null || c === null || f === null) {
      // One wrong field is named; several are the whole line.
      const wrong: Field[] = [];
      if (name.trim() === '') wrong.push('name');
      if (grams === 'empty' || grams === null || grams <= 0) wrong.push('serving');
      if (energy === 'empty' || energy === null) wrong.push('kcal');
      if (p === null) wrong.push('protein');
      if (c === null) wrong.push('carbs');
      if (f === null) wrong.push('fat');
      setProblem(wrong.length > 1 ? t('meal.own.invalid') : wrong[0] === 'name' ? t('meal.own.needName') : t('meal.own.check', { field: t(`meal.own.${wrong[0]}`).toLowerCase() }));
      return;
    }
    saving.current = true;
    setBusy(true);
    setProblem(null);
    try {
      const { data, response } = await api.POST('/v1/foods', {
        body: {
          name: name.trim(),
          ...(gtin === undefined ? {} : { gtin }),
          servingGrams: grams,
          kcal: energy,
          proteinG: p === 'empty' ? 0 : p,
          carbsG: c === 'empty' ? 0 : c,
          fatG: f === 'empty' ? 0 : f,
        },
      });
      if (data !== undefined) onCreated(data);
      else setProblem(t(response.status === 400 ? 'meal.own.invalid' : 'meal.own.failed'));
    } catch (error) {
      report({ name: error instanceof Error ? error.name : 'Unknown' });
      setProblem(t('meal.own.failed'));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  return (
    <Card testID="own-food">
      <Text accessibilityRole="header" style={[styles.title, { color: color.text }]}>
        {t('meal.own.title')}
      </Text>
      <TextField label={t('meal.own.name')} value={name} onChangeText={setName} maxLength={foodParams.ownFoodNameMax} />
      <View style={styles.pair}>
        <View style={styles.half}>
          <TextField label={t('meal.own.serving')} value={serving} onChangeText={setServing} suffix={t('meal.item.grams')} keyboardType="decimal-pad" maxLength={6} />
        </View>
        <View style={styles.half}>
          <TextField label={t('meal.own.kcal')} value={kcal} onChangeText={setKcal} suffix={t('food.budget.kcalUnit')} keyboardType="decimal-pad" maxLength={6} />
        </View>
      </View>
      <View style={styles.pair}>
        <View style={styles.half}>
          <TextField label={t('meal.own.protein')} value={protein} onChangeText={setProtein} suffix={t('meal.item.grams')} keyboardType="decimal-pad" maxLength={6} />
        </View>
        <View style={styles.half}>
          <TextField label={t('meal.own.carbs')} value={carbs} onChangeText={setCarbs} suffix={t('meal.item.grams')} keyboardType="decimal-pad" maxLength={6} />
        </View>
        <View style={styles.half}>
          <TextField label={t('meal.own.fat')} value={fat} onChangeText={setFat} suffix={t('meal.item.grams')} keyboardType="decimal-pad" maxLength={6} />
        </View>
      </View>
      {gtin !== undefined && <Text style={[styles.small, { color: color.muted }]}>{t('meal.own.barcode', { gtin })}</Text>}
      {problem !== null && <ProblemText style={[styles.small, { color: color.text }]}>{problem}</ProblemText>}
      <View style={styles.buttons}>
        <Button label={t('meal.own.save')} onPress={() => void save()} disabled={busy} />
        <Button label={t('meal.own.cancel')} variant="secondary" onPress={onCancel} disabled={busy} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: tokens.type.heading, fontWeight: tokens.weight.bold },
  pair: { flexDirection: 'row', gap: tokens.space.sm },
  half: { flex: 1, minWidth: 0 },
  buttons: { gap: tokens.space.sm },
  small: { fontSize: tokens.type.bodySmall },
});
