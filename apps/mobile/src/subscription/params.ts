/** How long the phone waits for the server to see a purchase, from data/parameters/subscription.json (ADR-029, ADR-057 D2). */
import params from '../../../../data/parameters/subscription.json';

type Parameter = { key: string; value: unknown };
function param<T>(key: string): T {
  const found = (params.parameters as Parameter[]).find((p) => p.key === key);
  if (found === undefined) throw new Error(`subscription.json has no ${key}`);
  return found.value as T;
}

export const subscriptionParams = {
  confirmAttempts: param<number>('subscription_confirm_attempts'),
  confirmIntervalMs: param<number>('subscription_confirm_interval_ms'),
};
