import type { APIRoute } from 'astro';
import catalog from '../data/catalog-snapshot.json';
import { guides } from '../data/guides';
import { SITE, abs } from '../lib/site';

/** llms.txt (llmstxt.org): a short guide to the site for AI answer tools, built from the same data as the pages. */
export const GET: APIRoute = () => {
  const stories = catalog.stories;
  const free = stories.filter((s) => s.access === 'free');
  const lines = [
    `# ${SITE.name}`,
    '',
    `> ${SITE.appName} is a free iPhone and iPad app of peaceful Bible stories to fall asleep to, with tonight’s King James Scripture passage and a Daily Teaching.`,
    '',
    `${SITE.name} (biblebedtime.uk) is the website for the ${SITE.appName} app. The app has ${stories.length} Bible stories, from Genesis to the Gospels, to listen to or watch, with a sleep timer. Of these, ${free.length} complete stories are free: ${free.map((s) => `${s.title} (${s.reference})`).join(', ')}. Tonight’s Scripture passage (King James Version) and its Daily Teaching are also free. An optional Premium subscription opens the full library, story audio downloads for offline listening and a two-minute sample of any story; Apple shows the price and renewal terms before you subscribe. The story list on this site was last taken from the app catalogue on ${catalog.snapshot}.`,
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
    `- [Daily Scriptures](${abs('/daily-scriptures/')}): a sample Scripture passage and Daily Teaching from the app`,
    `- [Devotionals](${abs('/devotionals/')}): the free Scripture passage and Daily Teaching; Premium adds prayers, closing blessings and the teaching archive`,
    '',
    '## Guides',
    '',
    ...guides.map((g) => `- [${g.title}](${abs(g.href)}): ${g.blurb}`),
    '',
    '## About and help',
    '',
    `- [About](${abs('/about/')}): why ${SITE.name} exists`,
    `- [Support](${abs('/support/')}): subscriptions, restoring purchases, playback and how to get in touch`,
    `- [Terms of Service](${abs('/terms/')})`,
    `- [Privacy Policy](${abs('/privacy/')}): for the official publishing accounts`,
    `- [Bible Bedtime Español privacy (iOS)](${abs('/privacy/bible-bedtime-espanol-ios/')}): privacy policy for the Spanish app, in Spanish`,
    '',
    `Contact: ${SITE.tiktok}`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
