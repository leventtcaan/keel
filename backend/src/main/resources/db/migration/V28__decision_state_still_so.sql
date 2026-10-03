-- K-525 (ADR-041 #62): the day the user last said a declared state is still so (STATE_STILL YES), on their calendar.
-- The question waits state_still_after_paused_weeks weeks after it. Health data like the state it is about: the row's.
alter table decision.declared_state add column still_so_on date check (still_so_on >= starts_on);
