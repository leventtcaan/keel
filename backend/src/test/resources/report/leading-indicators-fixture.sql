-- Synthetic rows for WeeklyReportTests (K-905, ADR-081): invented ids and times, no real person. The report runs "as of"
-- 2025-10-27 12:00 UTC (a Monday). Each account is named for what it checks; the expected numbers are in the test.

-- Sign-up week of Monday 2025-09-29: a1..a5, all made 2025-10-01 10:00 UTC; its week 2 is the days 2025-10-08 to 2025-10-14.
-- Sign-up week of Monday 2025-10-13: b1, b2, e (e made exactly two weeks before the report: settled, on the edge).
-- Sign-up week of Monday 2025-09-01: see the end of this file.
-- Outside the report: late (made after it), old (made in July: beyond the cohort weeks shown).
insert into identity.account (id, apple_subject, created_at)
values ('00000000-0000-0000-0000-0000000000a1', 'synthetic-a1', '2025-10-01 10:00+00'),
       ('00000000-0000-0000-0000-0000000000a2', 'synthetic-a2', '2025-10-01 10:00+00'),
       ('00000000-0000-0000-0000-0000000000a3', 'synthetic-a3', '2025-10-01 10:00+00'),
       ('00000000-0000-0000-0000-0000000000a4', 'synthetic-a4', '2025-10-01 10:00+00'),
       ('00000000-0000-0000-0000-0000000000a5', 'synthetic-a5', '2025-10-01 10:00+00'),
       ('00000000-0000-0000-0000-0000000000b1', 'synthetic-b1', '2025-10-14 10:00+00'),
       ('00000000-0000-0000-0000-0000000000b2', 'synthetic-b2', '2025-10-14 10:00+00'),
       ('00000000-0000-0000-0000-0000000000e1', 'synthetic-e1', '2025-10-13 12:00+00'),
       ('00000000-0000-0000-0000-0000000000f1', 'synthetic-late', '2025-10-28 09:00+00'),
       ('00000000-0000-0000-0000-0000000000f2', 'synthetic-old', '2025-07-02 09:00+00');

-- a1: first real call on day 7, applied (a plan change seen); a workout in week 2.
insert into decision.weekly_call (id, account_id, client_id, week_of, made_on, decided_at, parameters_hash, snapshot, decision,
                                  application, applied_at, plan_before, plan_after)
values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000a1', gen_random_uuid(), '2025-10-06', '2025-10-08',
        '2025-10-08 10:00+00', 'h', '{}', '{"action": {"type": "ADJUST_CALORIES"}}', 'APPLIED', '2025-10-08 10:00+00', '{}', '{}');
insert into training.workout (id, account_id, client_id, started_at, unclean_exercise_ids, paused_seconds)
values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000a1', gen_random_uuid(), '2025-10-10 10:00+00', '{}', 0);

-- a2: "no call yet" on day 5 (not a first value), a real call that changes nothing on day 12; a typed weigh-in in week 2.
insert into decision.weekly_call (id, account_id, client_id, week_of, made_on, decided_at, parameters_hash, snapshot, decision, application)
values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000a2', gen_random_uuid(), '2025-09-29', '2025-10-06',
        '2025-10-06 10:00+00', 'h', '{}', '{"action": {"type": "NO_DECISION_YET"}}', 'NOT_NEEDED'),
       (gen_random_uuid(), '00000000-0000-0000-0000-0000000000a2', gen_random_uuid(), '2025-10-13', '2025-10-13',
        '2025-10-13 10:00+00', 'h', '{}', '{"action": {"type": "CONTINUE"}}', 'NOT_NEEDED');
insert into measurement.weigh_in (id, account_id, client_id, measured_at, kg, source)
values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000a2', gen_random_uuid(), '2025-10-11 07:00+00', 80.0, 'MANUAL');

-- a3: made an account and nothing else.

-- a4: active in weeks 1 and 3 only; in week 2 only what arrives by itself (Apple Health weigh-in and cardio, an imported workout).
insert into training.workout (id, account_id, client_id, started_at, unclean_exercise_ids, paused_seconds, imported_from)
values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000a4', gen_random_uuid(), '2025-10-03 10:00+00', '{}', 0, null),
       (gen_random_uuid(), '00000000-0000-0000-0000-0000000000a4', gen_random_uuid(), '2025-10-17 10:00+00', '{}', 0, null),
       (gen_random_uuid(), '00000000-0000-0000-0000-0000000000a4', gen_random_uuid(), '2025-10-12 10:00+00', '{}', 0, 'STRONG');
insert into measurement.weigh_in (id, account_id, client_id, measured_at, kg, source)
values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000a4', gen_random_uuid(), '2025-10-11 07:00+00', 80.0, 'APPLE_HEALTH');
insert into training.cardio_session (id, account_id, client_id, day, minutes, source)
values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000a4', gen_random_uuid(), '2025-10-13', 30, 'APPLE_HEALTH');

-- a5: a meal in week 2 (the only thing done then); a plan-changing call on day 14, applied and later undone (still a plan change seen).
insert into nutrition.meal (id, account_id, client_id, eaten_at, day, slot)
values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000a5', gen_random_uuid(), '2025-10-09 12:00+00', '2025-10-09', 'LUNCH');
insert into decision.weekly_call (id, account_id, client_id, week_of, made_on, decided_at, parameters_hash, snapshot, decision,
                                  application, applied_at, undone_at, plan_before, plan_after)
values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000a5', gen_random_uuid(), '2025-10-13', '2025-10-15',
        '2025-10-15 12:00+00', 'h', '{}', '{"action": {"type": "DELOAD"}}', 'UNDONE', '2025-10-15 12:00+00', '2025-10-16 12:00+00', '{}', '{}');

-- b1: a real call on day 7 that was declined without ever being applied (no plan change seen); no activity of its own.
insert into decision.weekly_call (id, account_id, client_id, week_of, made_on, decided_at, parameters_hash, snapshot, decision,
                                  application, declined_at)
values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000b1', gen_random_uuid(), '2025-10-20', '2025-10-21',
        '2025-10-21 10:00+00', 'h', '{}', '{"action": {"type": "ADJUST_CALORIES"}}', 'DECLINED', '2025-10-21 11:00+00');

-- b2: its only call is after the report's time, so it counts for nothing.
insert into decision.weekly_call (id, account_id, client_id, week_of, made_on, decided_at, parameters_hash, snapshot, decision, application)
values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000b2', gen_random_uuid(), '2025-10-27', '2025-10-28',
        '2025-10-28 10:00+00', 'h', '{}', '{"action": {"type": "CONTINUE"}}', 'NOT_NEEDED');

-- e1: a workout on day 8 (week 2, settled on the edge); a real call on day 9, applied.
insert into training.workout (id, account_id, client_id, started_at, unclean_exercise_ids, paused_seconds)
values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000e1', gen_random_uuid(), '2025-10-21 12:00+00', '{}', 0);
insert into decision.weekly_call (id, account_id, client_id, week_of, made_on, decided_at, parameters_hash, snapshot, decision,
                                  application, applied_at, plan_before, plan_after)
values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000e1', gen_random_uuid(), '2025-10-20', '2025-10-22',
        '2025-10-22 12:00+00', 'h', '{}', '{"action": {"type": "INCREASE_CALORIES"}}', 'APPLIED', '2025-10-22 12:00+00', '{}', '{}');

-- late (after the report) and old (beyond the weeks shown): busy, and still not in any number.
insert into training.workout (id, account_id, client_id, started_at, unclean_exercise_ids, paused_seconds)
values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000f1', gen_random_uuid(), '2025-11-05 10:00+00', '{}', 0),
       (gen_random_uuid(), '00000000-0000-0000-0000-0000000000f2', gen_random_uuid(), '2025-07-10 10:00+00', '{}', 0);
insert into decision.weekly_call (id, account_id, client_id, week_of, made_on, decided_at, parameters_hash, snapshot, decision,
                                  application, applied_at, plan_before, plan_after)
values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000f2', gen_random_uuid(), '2025-07-07', '2025-07-09',
        '2025-07-09 10:00+00', 'h', '{}', '{"action": {"type": "ADJUST_CALORIES"}}', 'APPLIED', '2025-07-09 10:00+00', '{}', '{}');

-- Sign-up week of Monday 2025-09-01: eight accounts made 2025-09-01 22:00 UTC (late in the day, so that a window counted in
-- hours from the minute of sign-up would differ from one counted in UTC days). Its week 2 is the days 2025-09-08 to
-- 2025-09-14 (day 7 up to, not including, day 14). "in" accounts have rows on the first and last day of it and are active;
-- "out" accounts have rows on the days just before (09-07) and after (09-15) and are not. One pair per source that has only a day
-- (cardio, waist, photo check) and one for a source that has a time (a workout, 00:30 on day 7 is under seven days after sign-up).
insert into identity.account (id, apple_subject, created_at)
values ('00000000-0000-0000-0000-0000000000c1', 'synthetic-cardio-in', '2025-09-01 22:00+00'),
       ('00000000-0000-0000-0000-0000000000c0', 'synthetic-cardio-out', '2025-09-01 22:00+00'),
       ('00000000-0000-0000-0000-0000000000d1', 'synthetic-waist-in', '2025-09-01 22:00+00'),
       ('00000000-0000-0000-0000-0000000000d0', 'synthetic-waist-out', '2025-09-01 22:00+00'),
       ('00000000-0000-0000-0000-0000000000d3', 'synthetic-photo-in', '2025-09-01 22:00+00'),
       ('00000000-0000-0000-0000-0000000000d2', 'synthetic-photo-out', '2025-09-01 22:00+00'),
       ('00000000-0000-0000-0000-0000000000c3', 'synthetic-workout-in', '2025-09-01 22:00+00'),
       ('00000000-0000-0000-0000-0000000000c2', 'synthetic-workout-out', '2025-09-01 22:00+00');
insert into training.cardio_session (id, account_id, client_id, day, minutes, source)
values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000c1', gen_random_uuid(), '2025-09-08', 30, 'MANUAL'),
       (gen_random_uuid(), '00000000-0000-0000-0000-0000000000c1', gen_random_uuid(), '2025-09-14', 30, 'MANUAL'),
       (gen_random_uuid(), '00000000-0000-0000-0000-0000000000c0', gen_random_uuid(), '2025-09-07', 30, 'MANUAL'),
       (gen_random_uuid(), '00000000-0000-0000-0000-0000000000c0', gen_random_uuid(), '2025-09-15', 30, 'MANUAL');
insert into measurement.waist (id, account_id, client_id, measured_on, cm)
values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000d1', gen_random_uuid(), '2025-09-08', 80.0),
       (gen_random_uuid(), '00000000-0000-0000-0000-0000000000d1', gen_random_uuid(), '2025-09-14', 80.0),
       (gen_random_uuid(), '00000000-0000-0000-0000-0000000000d0', gen_random_uuid(), '2025-09-07', 80.0),
       (gen_random_uuid(), '00000000-0000-0000-0000-0000000000d0', gen_random_uuid(), '2025-09-15', 80.0);
insert into measurement.photo_check (id, account_id, client_id, taken_on, look)
values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000d3', gen_random_uuid(), '2025-09-08', 'SAME'),
       (gen_random_uuid(), '00000000-0000-0000-0000-0000000000d3', gen_random_uuid(), '2025-09-14', 'SAME'),
       (gen_random_uuid(), '00000000-0000-0000-0000-0000000000d2', gen_random_uuid(), '2025-09-07', 'SAME'),
       (gen_random_uuid(), '00000000-0000-0000-0000-0000000000d2', gen_random_uuid(), '2025-09-15', 'SAME');
insert into training.workout (id, account_id, client_id, started_at, unclean_exercise_ids, paused_seconds)
values (gen_random_uuid(), '00000000-0000-0000-0000-0000000000c3', gen_random_uuid(), '2025-09-08 00:30+00', '{}', 0),
       (gen_random_uuid(), '00000000-0000-0000-0000-0000000000c2', gen_random_uuid(), '2025-09-07 23:30+00', '{}', 0),
       (gen_random_uuid(), '00000000-0000-0000-0000-0000000000c2', gen_random_uuid(), '2025-09-15 00:30+00', '{}', 0);
