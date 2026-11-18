import { APP_STORE_LISTING } from './appstore';

// Shared facts for structured data, /llms.txt and the pages that state them.
// Every value here is shown on the site itself or on the App Store listing
// (id6773492861).
export const SITE = {
  name: 'Bible Bedtimes',
  appName: 'Bible Bedtimes',
  // The site's earlier name and its domain, so both point to the app.
  alternateName: ['Bible Bedtime', 'biblebedtime.uk'],
  url: 'https://biblebedtime.uk/',
  logo: 'https://biblebedtime.uk/assets/bible-bedtime-logo-20260520.png',
  // The contact route the Support, Privacy and Terms pages give.
  tiktok: 'https://www.tiktok.com/@biblebedtimestories22',
  appStore: APP_STORE_LISTING,
};

// Premium prices as set in App Store Connect. Apple shows the local price,
// which can differ outside the UK and US, before anyone subscribes.
export const PREMIUM = {
  monthly: { GBP: '4.99', USD: '4.99' },
  yearly: { GBP: '34.99', USD: '34.99' },
};
export const PRICE_TEXT = `£${PREMIUM.monthly.GBP} / $${PREMIUM.monthly.USD} a month or £${PREMIUM.yearly.GBP} / $${PREMIUM.yearly.USD} a year`;
export const TRIAL_TEXT = '2-week free trial';

// A much larger app has a near-identical name; say plainly that it is a different one.
export const NAME_NOTE = `${SITE.appName} is a different app from ‘Bedtime Bible’.`;

export const abs = (path: string) => new URL(path, SITE.url).href;

export const ORGANIZATION_ID = `${SITE.url}#organization`;
export const WEBSITE_ID = `${SITE.url}#website`;

export const organization = {
  '@type': 'Organization',
  '@id': ORGANIZATION_ID,
  name: SITE.name,
  alternateName: SITE.alternateName,
  url: SITE.url,
  logo: { '@type': 'ImageObject', url: SITE.logo },
  sameAs: [SITE.tiktok, SITE.appStore],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    url: abs('/support/'),
  },
};
