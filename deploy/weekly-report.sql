-- The weekly leading indicators (K-905, ADR-081): three numbers per sign-up week, worked out from tables the server already
-- keeps. Read-only, one statement, aggregates only: no account id, no health value is selected, so nothing here names or
-- describes a person. Run by deploy/weekly-report.sh on the VPS (psql, over SSH); the backend's own test
-- (WeeklyReportTests) runs this same file on synthetic rows.
--
-- The definitions (ADR-081 has the reasons):
--   started                an account, grouped by the Monday (UTC) of the week it was made.
--   time to first value    days from the account to its first real weekly call: a call whose action is not
--                          NO_DECISION_YET (U3: "no call yet" is not a call). Median over the accounts that reached it,
--                          with how many did. Accounts that have not reached it are left out, so a young cohort's median is
--                          too low until they do; read it with "reached".
--   week-2 retention       of the accounts at least two weeks old, the share active in their second week: from day 7 up to
--                          day 14 after the account was made. Active = the person did something themselves: started a
--                          workout, logged a cardio session, a weigh-in, a waist, a photo check or a meal, or answered the
--                          check-in (the weekly call). Not counted: what only arrives by itself (Apple Health weigh-ins and
--                          cardio, imported workouts) and signing in.
--   plan changed, seen     the share of accounts with at least one call that moved their plan and was applied (applied_at).
--                          Calls are made in the person's own check-in and the result is shown there (ADR-077), so an
--                          applied call is one that was shown; the server cannot see a screen.
--
-- The numbers that are settings, in one place: set keel.report_as_of ('2026-10-26 12:00+00'), keel.week_days and
-- keel.cohort_weeks before this statement to change them; unset, they are now(), 7 and 8.
with params as (
    select coalesce(nullif(current_setting('keel.report_as_of', true), '')::timestamptz, now()) as as_of,
           coalesce(nullif(current_setting('keel.week_days', true), '')::int, 7)                 as week_days,
           coalesce(nullif(current_setting('keel.cohort_weeks', true), '')::int, 8)              as cohort_weeks
),
-- The one place that says what "active" means: when each account did something itself (a day is its UTC midnight).
activity (account_id, at) as (
    select account_id, started_at from training.workout where imported_from is null
    union all
    select account_id, day::timestamp at time zone 'UTC' from training.cardio_session where source = 'MANUAL'
    union all
    select account_id, measured_at from measurement.weigh_in where source = 'MANUAL'
    union all
    select account_id, measured_on::timestamp at time zone 'UTC' from measurement.waist
    union all
    select account_id, taken_on::timestamp at time zone 'UTC' from measurement.photo_check
    union all
    select account_id, eaten_at from nutrition.meal
    union all
    select account_id, decided_at from decision.weekly_call
),
started as (
    select a.id, a.created_at, date_trunc('week', a.created_at at time zone 'UTC')::date as cohort, p.as_of, p.week_days
    from identity.account a
             cross join params p
    where a.created_at <= p.as_of
      and date_trunc('week', a.created_at at time zone 'UTC')::date >=
          (date_trunc('week', p.as_of at time zone 'UTC') - p.cohort_weeks * interval '7 days')::date
),
per_account as (
    select s.cohort,
           (select min(c.decided_at)
            from decision.weekly_call c
            where c.account_id = s.id
              and c.decided_at <= s.as_of
              and c.decision -> 'action' ->> 'type' <> 'NO_DECISION_YET') as first_call_at,
           s.created_at,
           s.created_at + 2 * s.week_days * interval '24 hours' <= s.as_of as settled,
           exists (select 1
                   from activity x
                   where x.account_id = s.id
                     and x.at >= s.created_at + s.week_days * interval '24 hours'
                     and x.at < s.created_at + 2 * s.week_days * interval '24 hours'
                     and x.at <= s.as_of)                                as active_in_week_2,
           exists (select 1
                   from decision.weekly_call c
                   where c.account_id = s.id
                     and c.applied_at is not null
                     and c.applied_at <= s.as_of)                        as saw_plan_change
    from started s
)
select coalesce(cohort::text, 'total')                                                          as cohort,
       count(*)                                                                                 as started,
       count(first_call_at)                                                                     as first_call_reached,
       round((percentile_cont(0.5) within group (order by extract(epoch from first_call_at - created_at) / 86400)
              filter (where first_call_at is not null))::numeric, 1)                            as first_call_median_days,
       count(*) filter (where settled)                                                          as week_2_eligible,
       count(*) filter (where settled and active_in_week_2)                                     as week_2_active,
       round(100.0 * count(*) filter (where settled and active_in_week_2)
                 / nullif(count(*) filter (where settled), 0), 1)                               as week_2_retention_pct,
       count(*) filter (where saw_plan_change)                                                  as plan_change_seen,
       round(100.0 * count(*) filter (where saw_plan_change) / nullif(count(*), 0), 1)         as plan_change_seen_pct
from per_account
group by grouping sets ((cohort), ())
order by grouping(cohort), cohort desc;
