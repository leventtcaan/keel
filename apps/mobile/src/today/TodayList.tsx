import { StyleSheet, Text, View } from "react-native";

import type { components } from "@/api/schema";
import { Card } from "@/components/Card";
import { t } from "@/copy";
import { useTheme } from "@/theme/theme";
import { tokens } from "@/theme/tokens";
import { formatWeight } from "@/units/units";
import { useUnits } from "@/services/ServicesProvider";

import { type Loaded, programToday } from "./today";

type Schemas = components["schemas"];
type Props = {
  day: string;
  weighIns: Loaded<Schemas["WeighIn"][]>;
  program: Loaded<Schemas["Program"]>;
  targets: Loaded<Schemas["Targets"]>;
};

/**
 * Today's list (prototype 2.1): the weigh-in, today's session, the steps. Each row shows what is known and leaves out
 * what is not — a part behind the consent or not there yet is simply not a row. The food row is the remaining budget
 * (K-409); the step count arrives from Apple Health (K-404).
 */
export function TodayList({ day, weighIns, program, targets }: Props) {
  const { color } = useTheme();
  const units = useUnits();
  const rows: { key: string; title: string; note?: string }[] = [];

  if (weighIns.state === "ready") {
    const latest = weighIns.value.at(-1);
    rows.push(
      latest === undefined
        ? {
            key: "weighIn",
            title: t("today.list.weighIn.todo"),
            note: t("today.list.weighIn.todoNote"),
          }
        : {
            key: "weighIn",
            title: t("today.list.weighIn.done"),
            note: formatWeight(latest.kg, units),
          },
    );
  }
  if (program.state === "ready") {
    const today = programToday(program.value, day);
    rows.push(
      today.kind === "session"
        ? {
            key: "training",
            title:
              today.day.nameKey === undefined
                ? (today.day.name ?? "")
                : t(`programDays.${today.day.nameKey}.name`),
            note: t("today.list.training.exercises", {
              count: today.day.exercises.length,
            }),
          }
        : {
            key: "training",
            title: t(
              today.kind === "rest"
                ? "today.list.training.rest"
                : "today.list.training.restWeek",
            ),
          },
    );
  } else if (program.state === "none") {
    rows.push({ key: "training", title: t("today.list.training.none") });
  }
  if (targets.state === "ready") {
    rows.push({
      key: "steps",
      title: t("today.list.steps.title"),
      note: t("today.list.steps.target", {
        steps: targets.value.stepsPerDay.toLocaleString("en-US"),
      }),
    });
  }
  if (rows.length === 0) return null;
  return (
    <Card testID="today-list">
      <Text style={[styles.label, { color: color.muted }]}>
        {t("today.list.title")}
      </Text>
      {rows.map((row) => (
        <View
          key={row.key}
          style={[styles.row, { borderTopColor: color.line }]}
        >
          <Text style={[styles.text, { color: color.text }]}>{row.title}</Text>
          {row.note !== undefined && (
            <Text style={[styles.small, { color: color.muted }]}>
              {row.note}
            </Text>
          )}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: tokens.type.label, fontWeight: tokens.weight.bold },
  row: {
    borderTopWidth: tokens.border.hairline,
    paddingTop: tokens.space.sm,
    gap: tokens.space.xs,
  },
  text: { fontSize: tokens.type.body },
  small: { fontSize: tokens.type.bodySmall },
});
