import catalog from '../data/catalog-snapshot.json';
import kjv from '../data/kjv.json';
import type { ProductPage } from './appstore';

export type Story = (typeof catalog.stories)[number];
export type KjvKey = keyof typeof kjv;

export const stories: Story[] = catalog.stories;
export const storyHref = (s: Story) => `/stories/${s.id}/`;

// Per story: a short KJV passage (a key in kjv.json, inside the story's own
// reference) and the App Store campaign token for its page. ct values stay
// ≤ 30 characters, lowercase, prefixed "site_" (see lib/appstore.ts).
const extras: Record<string, { passage: KjvKey; ct: string }> = {
  'genesis-creation-and-eden': { passage: 'Genesis 1:1-3', ct: 'site_st_genesis' },
  'noah-ark-and-rain': { passage: 'Genesis 9:13-15', ct: 'site_st_noah' },
  'david-and-goliath': { passage: '1 Samuel 17:37', ct: 'site_st_david_goliath' },
  'jericho-the-quiet-march': { passage: 'Joshua 6:10', ct: 'site_st_jericho' },
  'through-the-sea-by-night': { passage: 'Exodus 14:13-14', ct: 'site_st_red_sea' },
  'joseph-coat-and-promise': { passage: 'Genesis 50:20-21', ct: 'site_st_joseph' },
  'loaves-and-fishes': { passage: 'John 6:35', ct: 'site_st_loaves_fishes' },
  'elijah-still-small-voice': { passage: '1 Kings 19:11-12', ct: 'site_st_elijah' },
  'daniel-lions-den': { passage: 'Daniel 6:22', ct: 'site_st_daniel_lions' },
  'prodigal-son': { passage: 'Luke 15:20', ct: 'site_st_prodigal_son' },
  'good-samaritan': { passage: 'Luke 10:33-34', ct: 'site_st_good_samaritan' },
  'jacobs-ladder': { passage: 'Genesis 28:15-16', ct: 'site_st_jacobs_ladder' },
  'courage-through-the-night-1-hour': { passage: '1 Samuel 17:37', ct: 'site_st_hour_courage' },
  'psalm-23-the-shepherd': { passage: 'Psalms 23', ct: 'site_st_psalm_23' },
  'psalm-91-under-the-shadow': { passage: 'Psalms 91:1-2', ct: 'site_st_psalm_91' },
  'ruth-where-you-go': { passage: 'Ruth 1:16', ct: 'site_st_ruth' },
  'samuel-hears-god': { passage: '1 Samuel 3:10', ct: 'site_st_samuel' },
  'jonah-and-mercy': { passage: 'Jonah 4:2', ct: 'site_st_jonah' },
  'provision-bread-quiet-strength-1-hour': { passage: '1 Kings 19:5-7', ct: 'site_st_hour_provision' },
  'john-the-baptist-prepares-the-way': { passage: 'Luke 1:13-14', ct: 'site_st_john_baptist' },
  'esther-hidden-courage': { passage: 'Esther 4:14', ct: 'site_st_esther' },
  'beatitudes-on-the-mountain': { passage: 'Matthew 5:3-9', ct: 'site_st_beatitudes' },
  'mary-and-martha': { passage: 'Luke 10:41-42', ct: 'site_st_mary_martha' },
  'jesus-calms-the-storm': { passage: 'Mark 4:39-40', ct: 'site_st_calms_storm' },
  'gideon-and-the-fleece': { passage: 'Judges 6:23', ct: 'site_st_gideon' },
  'providence-hidden-in-plain-sight-1-hour': { passage: 'Ruth 2:12', ct: 'site_st_hour_providence' },
  'fiery-furnace': { passage: 'Daniel 3:24-25', ct: 'site_st_fiery_furnace' },
  'rest-listening-and-peace-1-hour': { passage: 'Psalms 23:1-3', ct: 'site_st_hour_rest' },
  'solomon-asks-for-wisdom': { passage: '1 Kings 3:9', ct: 'site_st_solomon' },
  'hannahs-prayer': { passage: '1 Samuel 1:27', ct: 'site_st_hannah' },
  'the-good-shepherd': { passage: 'John 10:11', ct: 'site_st_good_shepherd' },
  'the-transfiguration': { passage: 'Matthew 17:7', ct: 'site_st_transfiguration' },
  'the-road-to-emmaus': { passage: 'Luke 24:29', ct: 'site_st_emmaus' },
  'the-woman-at-the-well': { passage: 'John 4:13-14', ct: 'site_st_woman_at_well' },
};

/** The KJV passage key for a story, if one has been chosen and is in kjv.json. */
export function passageKey(s: Story): KjvKey | undefined {
  const key = extras[s.id]?.passage;
  return key && kjv[key] ? key : undefined;
}

export function campaignFor(s: Story): string {
  return extras[s.id]?.ct ?? `site_st_${s.id.replace(/[^a-z0-9]+/g, '_')}`.slice(0, 30).replace(/_+$/, '');
}

// Which App Store custom product page a story page's button opens
// (lib/appstore.ts PRODUCT_PAGES). Others use the default App Store page.
const FAMILY_STORIES = new Set([
  'noah-ark-and-rain',
  'david-and-goliath',
  'jonah-and-mercy',
  'daniel-lions-den',
  'jericho-the-quiet-march',
  'through-the-sea-by-night',
  'loaves-and-fishes',
  'fiery-furnace',
]);
export function productPageFor(s: Story): ProductPage | undefined {
  if (isPsalm(s)) return 'psalms';
  if (isLong(s)) return 'adults';
  if (FAMILY_STORIES.has(s.id)) return 'families';
  return undefined;
}

export const isFree = (s: Story) => s.access === 'free';
export const isLong = (s: Story) => s.durationSeconds >= 3000;
export const isPsalm = (s: Story) => s.reference.startsWith('Psalm');
export const isNT = (s: Story) => /^(Matthew|Mark|Luke|John)\b/.test(s.reference);

export type Section = 'hour-long' | 'old-testament' | 'new-testament' | 'psalms';
export function sectionOf(s: Story): Section {
  if (isLong(s)) return 'hour-long';
  if (isPsalm(s)) return 'psalms';
  return isNT(s) ? 'new-testament' : 'old-testament';
}

export const sections: { id: Section; title: string; label: string; note: string }[] = [
  { id: 'hour-long', title: 'Hour-long listens', label: 'Hour-long listen', note: 'Several stories woven into one long, unbroken listen for nights when you want the voice to keep going.' },
  { id: 'old-testament', title: 'Old Testament stories', label: 'Old Testament story', note: 'From the patriarchs to the exile: courage, waiting and God’s faithfulness.' },
  { id: 'new-testament', title: 'New Testament stories', label: 'New Testament story', note: 'The life and teaching of Jesus, told gently.' },
  { id: 'psalms', title: 'Psalms', label: 'Psalm', note: 'Two of the best-loved psalms, unfolded slowly.' },
];

export const minutes = (s: Story) => Math.round(s.durationSeconds / 60);

/** "18 minutes", or "1 hour 1 minute" for the long listens. */
export function lengthLabel(s: Story): string {
  const m = minutes(s);
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
  if (m < 60) return plural(m, 'minute');
  const h = Math.floor(m / 60);
  return m % 60 ? `${plural(h, 'hour')} ${plural(m % 60, 'minute')}` : plural(h, 'hour');
}

/** ISO 8601 duration, e.g. PT17M33S. */
export function isoDuration(s: Story): string {
  const t = s.durationSeconds;
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}${sec ? `${sec}S` : ''}`;
}

// Tags that describe the catalogue rather than the story.
const GENERIC = new Set(['Old Testament', 'New Testament', 'For Bedtime', 'For Rest', 'Family Listening', 'Featured Free', 'Weekly Feature', 'Popular Stories', 'One Hour', 'Long Listen', 'Bible Bedtime', 'Bible bedtime story', 'Christian bedtime story', 'Psalms']);

/** The story's own themes, without catalogue labels, titles, references or stray values. */
export function themes(s: Story): string[] {
  return s.tags.filter((t) => !GENERIC.has(t) && t !== s.title && t !== s.reference && !/^\d+$/.test(t) && !s.reference.startsWith(t));
}

// "Genesis 37–50" → { book: 'Genesis', from: 37, to: 50 }; "Luke 10:25–37" → Luke 10–10.
function chapters(ref: string) {
  const m = ref.trim().match(/^(.+?) (\d+)(?:[–-](\d+))?(?::.*)?$/);
  if (!m) return undefined;
  const [, book, from, to] = m;
  const isVerseRange = ref.includes(':');
  return { book: book.replace(/^Psalms?$/, 'Psalm'), from: Number(from), to: isVerseRange ? Number(from) : Number(to ?? from) };
}

/** For an hour-long listen: the single stories whose passages it draws on, in its own order. */
export function partsOf(s: Story): Story[] {
  if (!isLong(s)) return [];
  const desc = s.description.toLowerCase();
  const named = (o: Story) => desc.includes(o.title.toLowerCase().replace(/^the /, '').split(' — ')[0]);
  return s.reference.split('·').flatMap((part) => {
    const w = chapters(part);
    if (!w) return [];
    const found = stories.filter((o) => {
      const c = !isLong(o) && chapters(o.reference);
      return !!c && w.book === c.book && w.from >= c.from && w.from <= c.to;
    });
    // A chapter can hold two stories (Luke 10): keep the one the listen names, if it names one.
    return found.length > 1 && found.some(named) ? found.filter(named) : found;
  });
}

/** Three related stories: shared passages first, then shared themes, then the same part of the Bible. */
export function relatedTo(s: Story, count = 3): Story[] {
  const mine = new Set(themes(s));
  const parts = new Set(partsOf(s).map((p) => p.id));
  const score = (o: Story) =>
    (parts.has(o.id) || partsOf(o).some((p) => p.id === s.id) ? 10 : 0) +
    themes(o).filter((t) => mine.has(t)).length * 3 +
    (sectionOf(o) === sectionOf(s) ? 1 : 0) +
    (isFree(o) ? 0.5 : 0);
  return stories
    .filter((o) => o.id !== s.id)
    .map((o, i) => ({ o, i, sc: score(o) }))
    .sort((a, b) => b.sc - a.sc || a.i - b.i)
    .slice(0, count)
    .map((x) => x.o);
}
