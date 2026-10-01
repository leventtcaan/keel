import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { components } from "@/api/schema";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DecisionBlock } from "@/components/DecisionBlock";
import { t } from "@/copy";
import { useTheme } from "@/theme/theme";
import { tokens } from "@/theme/tokens";

import { labelKey, reasonLines } from "./today";

type Decision = components["schemas"]["Decision"];

// "Mon, Oct 5": the review day as a date only, in English like every word of the app.
const REVIEW_DAY = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/**
 * This week's call (K-212), in its own words: label, title and body from its copy key, whatever the action — the "not
 * yet" variants (U3), the short cut (K-227), a safety call as its general change of phase (ADR-028 #24: the words of
 * the copy key, nothing more). "Why this call" opens the reasons, each with its kind of source (U14), and the next review.
 */
export function CallCard({ decision }: { decision: Decision | null }) {
  const { color } = useTheme();
  const [open, setOpen] = useState(false);
  if (decision === null) {
    return (
      <Card>
        <Text style={[styles.label, { color: color.muted }]}>
          {t("today.call.eyebrow")}
        </Text>
        <Text style={[styles.text, { color: color.textSecondary }]}>
          {t("today.call.none")}
        </Text>
      </Card>
    );
  }
  const titleKey = `${decision.copyKey}.title`;
  const reasons = open ? (
    <View style={styles.reasons}>
      {reasonLines(decision).map((line, i) => (
        <View key={i} style={styles.reason}>
          {/* The leading reason is the call itself: its words are the block's title already. */}
          {line.titleKey !== null && line.titleKey !== titleKey && (
            <Text style={[styles.text, { color: color.decisionText }]}>
              {t(line.titleKey)}
            </Text>
          )}
          <Text style={[styles.small, { color: color.decisionMuted }]}>
            {t(`today.call.source.${line.tag}`)}
          </Text>
        </View>
      ))}
      <Text style={[styles.small, { color: color.decisionMuted }]}>
        {t("today.call.nextReview", {
          date: REVIEW_DAY.format(new Date(`${decision.nextReview}T00:00:00Z`)),
        })}
      </Text>
    </View>
  ) : null;
  return (
    <DecisionBlock
      testID="call"
      eyebrow={t(labelKey(decision.copyKey))}
      title={t(titleKey)}
    >
      <View style={styles.row}>
        <Text style={[styles.small, { color: color.decisionMuted }]}>
          {t("today.call.eyebrow")}
        </Text>
        <Text style={[styles.small, { color: color.decisionMuted }]}>
          {t(`today.call.confidence.${decision.confidence}`)}
        </Text>
      </View>
      <Text style={[styles.text, { color: color.decisionTextSecondary }]}>
        {t(`${decision.copyKey}.body`)}
      </Text>
      <Button
        label={open ? t("today.call.hide") : t("today.call.why")}
        variant="ghost"
        size="sm"
        onPress={() => setOpen(!open)}
      />
      {reasons}
    </DecisionBlock>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: tokens.space.sm,
  },
  reasons: { gap: tokens.space.sm },
  reason: { gap: tokens.space.xs },
});
