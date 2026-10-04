/**
 * The Terms of Use and the Privacy Policy the paywall links to (Apple 3.1.2; ADR-057 D3). Addresses are configuration —
 * EXPO_PUBLIC_TERMS_URL and EXPO_PUBLIC_PRIVACY_URL, inlined by Expo at build time — and the texts are M8's (K-801). Only an
 * https address is shown: one not set yet is left out, never a dead or unsafe link.
 */
export type LegalLink = { key: string; url: string };

export function legalLinks({ terms, privacy }: { terms: string | undefined; privacy: string | undefined }): LegalLink[] {
  const links = [
    { key: 'subscription.terms', url: terms?.trim() ?? '' },
    { key: 'subscription.privacy', url: privacy?.trim() ?? '' },
  ];
  return links.filter((link) => link.url.startsWith('https://'));
}

/** Both the Terms of Use and the Privacy Policy are there: only then is anything sold (Apple 3.1.2, ADR-057 D3). */
export function legalComplete(links: LegalLink[]): boolean {
  return ['subscription.terms', 'subscription.privacy'].every((key) => links.some((link) => link.key === key));
}

/** The build's links: the static reads are what Expo replaces, so they stay spelled out. */
export function configuredLegalLinks(): LegalLink[] {
  return legalLinks({ terms: process.env.EXPO_PUBLIC_TERMS_URL, privacy: process.env.EXPO_PUBLIC_PRIVACY_URL });
}
