-- K-993 (ADR-077 Ek 3): when the app first showed the plan, by the server's clock; never moved by a later call. The first
-- week, the first call's day and the first eight weeks count from it; without it from the profile's first save
-- (onboarded_at, K-990), then the account's first sign-in.
alter table profile.profile add column plan_seen_at timestamp with time zone;
