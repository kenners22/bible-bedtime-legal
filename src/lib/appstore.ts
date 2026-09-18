// App Store campaign links. The provider token (pt) is the account's own,
// generated in App Store Connect → Analytics → Acquisition → Campaigns
// (first used 2026-07-28 for p1_ig_goldenv1). The campaign token (ct) is
// free text: each placement gets its own so App Store Connect → Analytics →
// Sources → Campaigns shows which part of the site drove a download.
// Keep ct values ≤ 40 characters, lowercase, prefixed "site_".
export const APP_STORE_LISTING = 'https://apps.apple.com/gb/app/bible-bedtimes/id6773492861';
const PROVIDER_TOKEN = '128800181';

export function appStoreLink(campaign: string): string {
  return `${APP_STORE_LISTING}?pt=${PROVIDER_TOKEN}&ct=${encodeURIComponent(campaign)}&mt=8`;
}
