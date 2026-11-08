// App Store campaign links. The provider token (pt) is the account's own,
// generated in App Store Connect → Analytics → Acquisition → Campaigns
// (first used 2026-07-28 for p1_ig_goldenv1). The campaign token (ct) is
// free text: each placement gets its own so App Store Connect → Analytics →
// Sources → Campaigns shows which part of the site drove a download.
// Keep ct values ≤ 30 characters (App Store Connect's limit), lowercase,
// prefixed "site_". Links use Apple's own generated format
// (apps.apple.com/app/apple-store/id…, no storefront) so attribution matches
// exactly and visitors land in their own country's store.
export const APP_STORE_LISTING = 'https://apps.apple.com/gb/app/bible-bedtimes/id6773492861';
const CAMPAIGN_BASE = 'https://apps.apple.com/app/apple-store/id6773492861';
const PROVIDER_TOKEN = '128800181';

// Custom product pages (App Store Connect → Custom Product Pages): the same
// app page with screenshots and promotional text chosen for one kind of
// search. ppid picks the page; App Store Connect reports each page's views and
// downloads, and the campaign token still says which part of the site sent them.
export const PRODUCT_PAGES = {
  psalms: 'fe89002d-946b-4bc9-b981-d5663935c1bf',
  adults: '1d9bac35-aca3-441c-9731-674d291d9b08',
  families: '722af402-73d0-48d1-be7f-f50c50aef4bf',
  daily: 'cd4c6bd7-c68c-4dcf-9ae9-35d0a3556df6',
} as const;
export type ProductPage = keyof typeof PRODUCT_PAGES;

// Guide pages and the stories index, by campaign token.
const CAMPAIGN_PAGES: Record<string, ProductPage> = {
  site_guide_psalms_sleep: 'psalms',
  site_guide_sleep_stories: 'adults',
  site_guide_prayers: 'adults',
  site_guide_verses_sleep: 'daily',
  site_stories_index: 'families',
};

export function appStoreLink(campaign: string, page?: ProductPage): string {
  const ppid = PRODUCT_PAGES[page ?? CAMPAIGN_PAGES[campaign]];
  return `${CAMPAIGN_BASE}?pt=${PROVIDER_TOKEN}&ct=${encodeURIComponent(campaign)}${ppid ? `&ppid=${ppid}` : ''}&mt=8`;
}
