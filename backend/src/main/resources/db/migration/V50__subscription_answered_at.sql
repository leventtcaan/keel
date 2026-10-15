-- K-704 (ADR-056 Ek 3): the moment of the last RevenueCat REST answer applied to an account's subscription. last_event_at stays the
-- last WEBHOOK event's moment (a REST answer never moves it), so a webhook delayed or sent again, stamped before an answer, still
-- applies; answered_at orders answers against answers (an older answer never replaces a newer one). Null until an answer is applied.
-- Same lifetime as the row: deleted with the account, exported to the user.
alter table subscription.subscription add column answered_at timestamp with time zone;
