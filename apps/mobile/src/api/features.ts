/**
 * What the phone says it can show (ADR-091 Ek 1, K-1202). The server holds a call back, and refuses its detail with 403
 * ENTITLEMENT_REQUIRED, only for a phone that lists `locked-calls`: the 1.0 phone does not, and keeps reading every call in full.
 * The names are parameters (K2), not literals; the server reads the same from data/parameters/quota.yaml.
 */
import { subscriptionParams } from '@/subscription/params';

export const clientFeatures = {
  header: subscriptionParams.clientFeaturesHeader,
  lockedCalls: subscriptionParams.lockedCallsToken,
};
