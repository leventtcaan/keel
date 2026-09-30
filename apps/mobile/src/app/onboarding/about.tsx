import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { TextField } from '@/components/TextField';
import { t } from '@/copy';
import { birthYearProblem, heightCm } from '@/onboarding/draft';
import { useDraft } from '@/onboarding/OnboardingContext';
import { onboardingParams } from '@/onboarding/params';
import { StepFrame } from '@/onboarding/StepFrame';
import { useAppServices, useUnits } from '@/services/ServicesProvider';
import { useTheme } from '@/theme/theme';
import { tokens } from '@/theme/tokens';
import { type UnitSystem, parseWaistCm, parseWeightKg } from '@/units/units';

const YEAR_LENGTH = 4;
/** The shortest height in centimetres has three digits (100, the profile's minimum). */
const MIN_CM_DIGITS = String(onboardingParams.heightMinCm).length;
/** A weight or a waist has at least two digits; one typed digit is not yet wrong. */
const MIN_WEIGHT_DIGITS = 2;
const PROBLEMS = {
  missing: null,
  not_a_year: 'onboarding.about.notAYear',
  too_young: 'onboarding.about.tooYoung',
} as const;

export default function AboutStep() {
  const { draft, update } = useDraft();
  const { units } = useAppServices();
  const system = useUnits();
  const { color } = useTheme();

  const height = draft.height;
  const metric = system === 'METRIC';
  // A problem shows once the answer could be complete — not on the first digit of "178" or "1994".
  const heightTyped = metric ? height.cm.trim().length >= MIN_CM_DIGITS : height.feet.trim() !== '';
  const heightProblem = heightTyped && heightCm(height, system) === null ? t('onboarding.about.heightInvalid') : null;
  const yearTyped = draft.birthYear.trim().length >= YEAR_LENGTH;
  const yearKey = yearTyped ? PROBLEMS[birthYearProblem(draft.birthYear, new Date().getFullYear()) ?? 'missing'] : null;

  // No profile yet: the choice stays on the phone, without the network, and goes out with the profile (K-310).
  const choose = (next: UnitSystem) => void units.keepOnPhone(next);

  // Metric types centimetres; imperial feet and inches (K-310). Built here, outside the JSX below.
  const heightFields = metric ? (
    <TextField
      label={t('onboarding.about.heightCm')}
      value={height.cm}
      onChangeText={(cm) => update({ height: { ...height, cm } })}
      suffix={t('units.cmUnit')}
      keyboardType="decimal-pad"
      problem={heightProblem}
    />
  ) : (
    <View style={styles.row}>
      <TextField
        label={t('onboarding.about.heightFeet')}
        value={height.feet}
        onChangeText={(feet) => update({ height: { ...height, feet } })}
        suffix={t('units.ftUnit')}
        keyboardType="number-pad"
        problem={heightProblem}
      />
      <TextField
        label={t('onboarding.about.heightInches')}
        value={height.inches}
        onChangeText={(inches) => update({ height: { ...height, inches } })}
        suffix={t('units.inUnit')}
        keyboardType="number-pad"
      />
    </View>
  );

  // With the health consent only (ADR-030 #25): the starting weight, and the waist if the user knows it.
  const granted = draft.healthConsent === 'granted';
  const weightProblem =
    draft.weight.trim().length >= MIN_WEIGHT_DIGITS && parseWeightKg(draft.weight, system) === null
      ? t('onboarding.about.weightInvalid')
      : null;
  const waistProblem =
    draft.waist.trim().length >= MIN_WEIGHT_DIGITS && parseWaistCm(draft.waist, system) === null
      ? t('onboarding.about.waistInvalid')
      : null;
  const healthFields = granted ? (
    <>
      <TextField
        label={t('onboarding.about.weight')}
        value={draft.weight}
        onChangeText={(weight) => update({ weight })}
        suffix={t(metric ? 'units.kgUnit' : 'units.lbUnit')}
        keyboardType="decimal-pad"
        hint={t('onboarding.about.weightHint')}
        problem={weightProblem}
      />
      <TextField
        label={t('onboarding.about.waist')}
        value={draft.waist}
        onChangeText={(waist) => update({ waist })}
        suffix={t(metric ? 'units.cmUnit' : 'units.inUnit')}
        keyboardType="decimal-pad"
        hint={t('onboarding.about.waistHint')}
        problem={waistProblem}
      />
    </>
  ) : null;

  return (
    <StepFrame step="about" title={t('onboarding.about.title')}>
      <Text style={[styles.label, { color: color.muted }]}>{t('onboarding.about.units')}</Text>
      <View style={styles.row}>
        <Chip label={t('onboarding.about.metric')} selected={system === 'METRIC'} onPress={() => choose('METRIC')} />
        <Chip
          label={t('onboarding.about.imperial')}
          selected={system === 'IMPERIAL'}
          onPress={() => choose('IMPERIAL')}
        />
      </View>
      {heightFields}
      <TextField
        label={t('onboarding.about.birthYear')}
        value={draft.birthYear}
        onChangeText={(birthYear) => update({ birthYear })}
        keyboardType="number-pad"
        maxLength={YEAR_LENGTH}
        hint={t('onboarding.about.birthYearHint')}
        problem={yearKey === null ? null : t(yearKey)}
      />
      <Text style={[styles.label, { color: color.muted }]}>{t('onboarding.about.sex')}</Text>
      <View style={styles.row}>
        <Chip
          label={t('onboarding.about.male')}
          selected={draft.sex === 'MALE'}
          onPress={() => update({ sex: 'MALE' })}
        />
        <Chip
          label={t('onboarding.about.female')}
          selected={draft.sex === 'FEMALE'}
          onPress={() => update({ sex: 'FEMALE' })}
        />
      </View>
      <Text style={[styles.note, { color: color.muted }]}>{t('onboarding.about.sexHint')}</Text>
      {healthFields}
    </StepFrame>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.sm },
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.semibold },
  note: { fontSize: tokens.type.bodySmall },
});
