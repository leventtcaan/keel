-- How long the user has trained (K-954, ADR-072 #3): asked in the new onboarding, it changes the flow, not the engine.
-- Optional: a profile made before it was asked has none.
alter table profile.profile
    add column experience text check (experience in ('NEW', 'UNDER_1Y', 'Y1_3', 'Y3_PLUS'));
