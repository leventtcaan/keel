import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { t } from '@/copy';
import { useDraft } from '@/onboarding/OnboardingContext';
import { StepFrame } from '@/onboarding/StepFrame';
import { Wheel } from '@/onboarding/Wheel';
import {
  heightFromWheel,
  heightOnWheel,
  heightValues,
  suggestedAnswers,
  weightOnWheel,
  weightValues,
  yearValues,
} from '@/onboarding/wheels';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { INCHES_PER_FOOT, type UnitSystem, weightInput } from '@/units/units';

/**
 * #ob-about (ADR-072 #2): height, weight and year of birth on scroll wheels, sex in two options "for the energy math".
 * Height and year start on a suggestion that counts as the answer; the weight is asked only with the health consent
 * (ADR-030 #25) and counts only once its wheel is moved, because it goes out as the first weigh-in. The units are chosen
 * here too (K-310): no profile yet, so the choice stays on the phone and goes out with the profile.
 */
export default function AboutStep() {
  const { draft, update } = useDraft();
  const { units } = useAppServices();
  const system = useUnits();
  const { color } = useTheme();
  const metric = system === 'METRIC';
  const thisYear = new Date().getFullYear();

  // A weight already set is cleared: 84 picked as kg must not quietly become 84 lb. (Height keeps a field per unit.)
  const choose = (next: UnitSystem) => {
    if (next !== system) update({ weight: '', waist: '' });
    void units.keepOnPhone(next);
  };

  const years = yearValues(thisYear);
  const year = years.includes(Number(draft.birthYear)) ? Number(draft.birthYear) : Number(suggestedAnswers(thisYear).birthYear);
  const height = (value: number) =>
    metric
      ? String(value)
      : t('units.feetInches', { feet: Math.floor(value / INCHES_PER_FOOT), inches: value % INCHES_PER_FOOT });
  // With the health consent only (ADR-030 #25). Built outside the JSX below (the raw-text guard reads JSX children).
  const weight =
    draft.healthConsent === 'granted' ? (
      <Wheel
        label={t('onboarding.about.weight')}
        unit={t(metric ? 'units.kgUnit' : 'units.lbUnit')}
        values={weightValues(system)}
        value={weightOnWheel(draft.weight, system)}
        unset={draft.weight === ''}
        format={(value) => (metric ? weightInput(value, 'METRIC') : String(value))}
        onChange={(value) => update({ weight: String(value) })}
      />
    ) : null;

  return (
    <StepFrame step="about" title={t('onboarding.about.title')} why={t('onboarding.about.why')}>
      <View style={styles.row}>
        <Chip label={t('onboarding.about.metric')} selected={metric} onPress={() => choose('METRIC')} />
        <Chip label={t('onboarding.about.imperial')} selected={!metric} onPress={() => choose('IMPERIAL')} />
      </View>
      <View style={styles.wheels}>
        <Wheel
          label={t('onboarding.about.height')}
          unit={metric ? t('units.cmUnit') : undefined}
          values={heightValues(system)}
          value={heightOnWheel(draft.height, system)}
          format={height}
          onChange={(value) => update({ height: heightFromWheel(value, system, draft.height) })}
        />
        {weight}
        <Wheel
          label={t('onboarding.about.born')}
          unit={t('onboarding.about.year')}
          values={years}
          value={year}
          format={String}
          onChange={(value) => update({ birthYear: String(value) })}
        />
      </View>
      <Text style={[styles.label, { color: color.muted }]}>{t('onboarding.about.sex')}</Text>
      <View style={styles.row}>
        <Chip label={t('onboarding.about.male')} selected={draft.sex === 'MALE'} onPress={() => update({ sex: 'MALE' })} />
        <Chip label={t('onboarding.about.female')} selected={draft.sex === 'FEMALE'} onPress={() => update({ sex: 'FEMALE' })} />
      </View>
    </StepFrame>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  wheels: { flexDirection: 'row', gap: tokens.space.sm },
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
});
