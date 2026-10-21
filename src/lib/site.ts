import { APP_STORE_LISTING } from './appstore';

// Shared facts for structured data and /llms.txt. Every value here is shown
// on the site itself or on the App Store listing (id6773492861).
export const SITE = {
  name: 'Bible Bedtime',
  appName: 'Bible Bedtimes',
  url: 'https://biblebedtime.uk/',
  logo: 'https://biblebedtime.uk/assets/bible-bedtime-logo-20260520.png',
  // The contact route the Support, Privacy and Terms pages give.
  tiktok: 'https://www.tiktok.com/@biblebedtimestories22',
  appStore: APP_STORE_LISTING,
};

export const abs = (path: string) => new URL(path, SITE.url).href;

export const ORGANIZATION_ID = `${SITE.url}#organization`;
export const WEBSITE_ID = `${SITE.url}#website`;

export const organization = {
  '@type': 'Organization',
  '@id': ORGANIZATION_ID,
  name: SITE.name,
  url: SITE.url,
  logo: { '@type': 'ImageObject', url: SITE.logo },
  sameAs: [SITE.tiktok, SITE.appStore],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    url: abs('/support/'),
  },
};
