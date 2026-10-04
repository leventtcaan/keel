/**
 * Apple Health is read only with both consents given (K-402, K-404, K-616): the health data consent, to keep what is read
 * (ADR-030 #25), and Apple Health's, to read it. The regular read and the import ask the same question.
 */
export async function bothHealthConsents(consents: { granted(kind: 'HEALTH_DATA' | 'APPLE_HEALTH'): Promise<boolean> }): Promise<boolean> {
  return (await consents.granted('HEALTH_DATA')) && (await consents.granted('APPLE_HEALTH'));
}
