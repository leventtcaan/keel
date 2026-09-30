-- K-228 (ADR-028 #24, GDPR Art. 9): the hard stop follows nothing but a yes to the cycle question, so a call kept
-- under its own kind keeps that answer. From K-228 it is kept as what it does to the plan, a change of phase to
-- building, with a safety mark and the change-of-phase words (DecisionJson). This rewrites the calls kept before.
update decision.weekly_call
set decision = jsonb_set(
        jsonb_set(
            jsonb_set(decision, '{action}', jsonb_build_object('type', 'CHANGE_PHASE', 'to', 'BULK')),
            '{copyKey}', to_jsonb(replace(decision ->> 'copyKey', 'decision.hard_stop.', 'decision.change_phase.'))),
        '{safety}', to_jsonb(true))
where decision -> 'action' ->> 'type' = 'HARD_STOP';
