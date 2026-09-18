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

export function appStoreLink(campaign: string): string {
  return `${CAMPAIGN_BASE}?pt=${PROVIDER_TOKEN}&ct=${encodeURIComponent(campaign)}&mt=8`;
}
