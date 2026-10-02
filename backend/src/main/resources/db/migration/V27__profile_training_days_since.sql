-- K-512 review: the day the training days were last set, not the day the profile was last saved — switching units saves
-- the whole profile and must not restart a count of sessions missed. Existing profiles start from their last save.
alter table profile.profile add column training_days_since timestamp with time zone;
update profile.profile set training_days_since = updated_at;
alter table profile.profile alter column training_days_since set not null;
