import type { APIRoute } from 'astro';
import catalog from '../data/catalog-snapshot.json';
import { guides } from '../data/guides';
import { SITE, NAME_NOTE, PRICE_TEXT, TRIAL_TEXT, abs } from '../lib/site';
import { storyHref, lengthLabel, isFree, isLong } from '../lib/stories';

/** llms.txt (llmstxt.org): a short guide to the site for AI answer tools, built from the same data as the pages. */
export const GET: APIRoute = () => {
  const stories = catalog.stories;
  const free = stories.filter((s) => s.access === 'free');
  const hourLong = stories.filter(isLong).length;
  const lines = [
    `# ${SITE.name}`,
    '',
    `> ${SITE.appName} is a Christian sleep app for iPhone and iPad: calm Bible stories read aloud to fall asleep to, with tonight’s King James Scripture passage and a Daily Teaching. Free to download. Made in the UK.`,
    '',
    `biblebedtime.uk is the website for the ${SITE.appName} app (sometimes written Bible Bedtime). ${NAME_NOTE} The app has ${stories.length} Bible stories, from Genesis to the Gospels, to listen to or watch. The stories are calm retellings of named Bible passages, not word-for-word readings; only the Daily Scripture passage is King James Version text. The story list on this site was last taken from the app catalogue on ${catalog.snapshot}.`,
    '',
    '## Key facts',
    '',
    `- Name: ${SITE.appName} (plural), for iPhone and iPad. Rated 4+. Made in the UK, launched June 2026.`,
    `- Free: the app is free to download. ${free.length} complete stories are free (${free.map((s) => `${s.title}, ${s.reference}`).join('; ')}), as are tonight’s King James Daily Scripture passage and its Daily Teaching, a sleep timer of up to 30 minutes and a two-minute sample of every Premium story.`,
    `- Premium: ${PRICE_TEXT}, each with a ${TRIAL_TEXT}. Apple shows the local price before you subscribe.`,
    `- Premium adds the full library, including ${hourLong} hour-long stories and episodes on Psalm 23 and Psalm 91; sleep timers up to 10 hours; an end-of-story timer; All night (up to 10 hours) continuous listening; and story audio downloads for offline listening.`,
    '- Families: several stories suit listening together, such as Noah, David and Goliath, and Daniel in the Lions’ Den.',
    '',
    '## The app',
    '',
    `- [Bible Bedtimes home](${abs('/')}): what the app does, the free stories, Premium and FAQs`,
    `- [About the app](${abs('/download/')}): what is free and how to download it`,
    `- [Bible Bedtimes on the App Store](${SITE.appStore}): iPhone and iPad listing`,
    '',
    '## Stories and Scripture',
    '',
    `- [Bible stories](${abs('/bible-stories/')}): the story collections, from Genesis to the Gospels`,
    `- [All stories](${abs('/stories/')}): every story in the app, with its passage, length and whether it is free`,
    `- [Daily Scriptures](${abs('/daily-scriptures/')}): a sample Scripture passage and Daily Teaching from the app`,
    `- [Devotionals](${abs('/devotionals/')}): the free Scripture passage and Daily Teaching; Premium adds prayers, closing blessings and the teaching archive`,
    '',
    '## Guides',
    '',
    ...guides.map((g) => `- [${g.title}](${abs(g.href)}): ${g.blurb}`),
    '',
    '## Story pages',
    '',
    ...stories.map((s) => `- [${s.title}](${abs(storyHref(s))}): ${s.reference}, ${lengthLabel(s)}, ${isFree(s) ? 'free' : 'Premium'}. ${s.description}`),
    '',
    '## About and help',
    '',
    `- [About](${abs('/about/')}): why ${SITE.name} exists`,
    `- [Support](${abs('/support/')}): subscriptions, restoring purchases, playback and how to get in touch`,
    `- [Terms of Service](${abs('/terms/')})`,
    `- [Privacy Policy](${abs('/privacy/')}): for the official publishing accounts`,
    `- [Bible Bedtime Español privacy (iOS)](${abs('/privacy/bible-bedtime-espanol-ios/')}): privacy policy for the Spanish app, in Spanish`,
    '',
    `Contact: ${abs('/support/')}`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
