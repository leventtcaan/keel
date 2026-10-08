-- K-990 (ADR-077 Ek 2): when onboarding finished — the profile's first save, never moved by a later one. The first week,
-- and with it the first call's day, counts from it. Profiles saved before this column have none: they keep counting from
-- the account's first sign-in, as they always did.
alter table profile.profile add column onboarded_at timestamp with time zone;
