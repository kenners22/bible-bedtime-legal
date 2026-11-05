import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const dist = path.join(root, 'dist');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'src/data/catalog-snapshot.json'), 'utf8'));
const kjv = JSON.parse(fs.readFileSync(path.join(root, 'src/data/kjv.json'), 'utf8'));
const stories = catalog.stories;

const read = (rel) => fs.readFileSync(path.join(dist, rel), 'utf8');
const decode = (text) =>
  text.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”').replace(/&rsquo;/g, '’').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const jsonLd = (html) =>
  [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].flatMap((m) => {
    const data = JSON.parse(m[1]);
    return data['@graph'] ?? [data];
  });
const appStoreCts = (html) =>
  [...html.matchAll(/href="(https:\/\/apps\.apple\.com\/[^"]+)"/g)].map((m) => new URL(m[1].replaceAll('&amp;', '&')).searchParams.get('ct'));

function listHtml(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? listHtml(p) : p.endsWith('.html') ? [p] : [];
  });
}
// Pages built by Astro (public/ legacy pages are copied as they are).
const legacy = /[\\/](app|platform-info|callback|meta-ads-oauth)[\\/]index\.html$/;
const astroPages = listHtml(dist).filter((f) => !legacy.test(f));

test.describe('story pages', () => {
  test('every catalogue story has its own page with the facts, a KJV passage, related stories and a tracked app link', () => {
    expect(stories).toHaveLength(34);
    const cts = new Set();
    const titles = new Set();

    for (const story of stories) {
      const rel = `stories/${story.id}/index.html`;
      const html = read(rel);
      const text = decode(html.replace(/<script.*?<\/script>/gs, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');

      expect(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1] && decode(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)[1]), rel).toBe(story.title);
      expect(text, rel).toContain(story.description);
      expect(text, rel).toContain(story.reference);
      expect(text, rel).toContain(story.access === 'free' ? 'In the app Free' : 'In the app Premium');
      expect(text, rel).toMatch(/Length \d+ (minutes|hours?)/);

      // The passage is real text from kjv.json, from a book the story covers.
      const passage = Object.values(kjv).find((p) => text.includes(p.reference + ' · KJV'));
      expect(passage, `${rel} KJV passage`).toBeTruthy();
      for (const v of passage.verses) expect(text, rel).toContain(v.t);
      const book = passage.reference.replace(/ \d+(:.*)?$/, '').replace(/^Psalm$/, 'Psalm');
      expect(story.reference, `${rel} passage ${passage.reference}`).toContain(book);

      // Three related stories, each a real page.
      const related = html.match(/<section aria-labelledby="related-heading"[\s\S]*?<\/section>/)[0];
      const links = [...related.matchAll(/href="(\/stories\/[^"]+\/)"/g)].map((m) => m[1]);
      expect(links, rel).toHaveLength(3);
      expect(links, rel).not.toContain(`/stories/${story.id}/`);
      for (const href of links) expect(fs.existsSync(path.join(dist, href, 'index.html')), href).toBe(true);

      // A per-story App Store campaign token.
      const storyCts = [...new Set(appStoreCts(html).filter((ct) => ct !== 'site_header'))];
      expect(storyCts, rel).toHaveLength(1);
      expect(storyCts[0], rel).toMatch(/^site_st_[a-z0-9_]+$/);
      expect(storyCts[0].length, rel).toBeLessThanOrEqual(30);
      expect(cts.has(storyCts[0]), `${rel} duplicate ct ${storyCts[0]}`).toBe(false);
      cts.add(storyCts[0]);
      expect(html, rel).toContain('>Listen in the app</a>');

      // Structured data: the audio story and its breadcrumb.
      const data = jsonLd(html);
      const audio = data.find((d) => d['@type'] === 'AudioObject');
      expect(audio?.name, rel).toBe(story.title);
      expect(audio?.duration, rel).toMatch(/^PT(\d+H)?(\d+M)?(\d+S)?$/);
      expect(audio?.isAccessibleForFree, rel).toBe(story.access === 'free');
      const crumbs = data.find((d) => d['@type'] === 'BreadcrumbList')?.itemListElement ?? [];
      expect(crumbs.map((c) => c.item), rel).toEqual(['https://biblebedtime.uk/', 'https://biblebedtime.uk/stories/', `https://biblebedtime.uk/stories/${story.id}/`]);

      const title = html.match(/<title>([^<]+)<\/title>/)[1];
      expect(titles.has(title), `${rel} duplicate title`).toBe(false);
      titles.add(title);
    }
  });

  test('the stories index, guides and footer link to every story page', () => {
    const index = read('stories/index.html');
    for (const story of stories) expect(index, story.id).toContain(`href="/stories/${story.id}/"`);
    expect(jsonLd(index).find((d) => d['@type'] === 'CollectionPage')?.mainEntity?.numberOfItems).toBe(stories.length);

    const sleepStories = read('bible-sleep-stories/index.html');
    for (const story of stories) expect(sleepStories, story.id).toContain(`href="/stories/${story.id}/"`);
    expect(sleepStories).toContain('href="/stories/"');
    expect(read('bible-stories/index.html')).toContain('href="/stories/"');
    expect(read('index.html')).toContain('href="/stories/"');
  });

  test('llms.txt and the sitemap list every story page', () => {
    const llms = read('llms.txt');
    const sitemap = read('sitemap-0.xml');
    for (const story of stories) {
      const url = `https://biblebedtime.uk/stories/${story.id}/`;
      expect(llms, story.id).toContain(`(${url})`);
      expect(sitemap, story.id).toContain(`<loc>${url}</loc>`);
    }
    expect(sitemap).toContain('<loc>https://biblebedtime.uk/stories/</loc>');
  });
});

test.describe('site-wide head and body tags', () => {
  test('the Smart App Banner is on English pages only', () => {
    const banner = '<meta name="apple-itunes-app" content="app-id=6773492861">';
    for (const file of astroPages) {
      const rel = path.relative(dist, file);
      const html = fs.readFileSync(file, 'utf8');
      const english = /<html lang="en/.test(html) && rel !== path.join('childrens-stories', 'index.html');
      if (english) expect(html, rel).toContain(banner);
      else expect(html, rel).not.toContain('apple-itunes-app');
    }
    expect(read('index.html')).toContain(banner);
    expect(read('privacy/bible-bedtime-espanol-ios/index.html')).not.toContain('apple-itunes-app');
  });

  test('the Cloudflare Web Analytics beacon is on every built page, once', () => {
    const beacon = `<!-- Cloudflare Web Analytics --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "81671c4a884c49d387b2ed2f8950cbcf"}'></script><!-- End Cloudflare Web Analytics -->`;
    expect(astroPages.length).toBeGreaterThan(40);
    for (const file of astroPages) {
      const html = fs.readFileSync(file, 'utf8');
      expect(html.split(beacon).length - 1, path.relative(dist, file)).toBe(1);
      expect(html.indexOf(beacon), path.relative(dist, file)).toBeLessThan(html.indexOf('</body>'));
    }
    expect(read('privacy/index.html')).toContain('Cloudflare Web Analytics');
  });

  test('psalms-for-sleep title and description fit the search snippet', () => {
    const html = read('psalms-for-sleep/index.html');
    const title = decode(html.match(/<title>([^<]+)<\/title>/)[1]);
    const description = decode(html.match(/<meta name="description" content="([^"]+)"/)[1]);
    expect(title.toLowerCase()).toContain('psalms for sleep');
    expect(title.toLowerCase()).toContain('bedtime psalms');
    expect([...title].length).toBeLessThanOrEqual(60);
    expect([...description].length).toBeLessThanOrEqual(160);
  });

  test('every verse on bible-verses-for-sleep is real KJV text from kjv.json and the count matches', () => {
    const html = read('bible-verses-for-sleep/index.html');
    const quotes = [...html.matchAll(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/g)].map((m) => decode(m[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim());
    const texts = new Set(Object.values(kjv).map((p) => `“${p.text}”`));
    for (const q of quotes) expect(texts.has(q), q).toBe(true);
    expect(quotes.length).toBeGreaterThanOrEqual(30);
    expect(decode(html.match(/<h1\b[^>]*>([^<]+)<\/h1>/)[1])).toBe(`${quotes.length} Bible verses for sleep`);
    expect(html.match(/<h2[^>]*>[^<]*\?<\/h2>/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
  });
});

const faqPages = ['/', '/bible-stories/', '/bible-sleep-stories/', '/bible-verses-for-sleep/', '/psalms-for-sleep/', '/bedtime-prayers-for-adults/'];

test.describe('FAQ structured data', () => {
  for (const route of faqPages) {
    test(`${route} FAQPage schema matches the visible questions and answers`, async ({ page }) => {
      await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
      await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
      await page.route('https://static.cloudflareinsights.com/**', (r) => r.abort());
      await page.goto(route, { waitUntil: 'domcontentloaded' });

      const schema = (await page.locator('script[type="application/ld+json"]').allTextContents())
        .map((t) => JSON.parse(t))
        .flatMap((d) => d['@graph'] ?? [d])
        .filter((d) => d['@type'] === 'FAQPage');
      expect(schema).toHaveLength(1);
      const fromSchema = schema[0].mainEntity.map((q) => ({ q: q.name, a: q.acceptedAnswer.text }));

      const visible = await page.locator('section[aria-labelledby="faq-heading"] details').evaluateAll((items) =>
        items.map((d) => {
          const summary = d.querySelector('summary').cloneNode(true);
          summary.querySelectorAll('[aria-hidden="true"]').forEach((s) => s.remove());
          return { q: summary.textContent.trim(), a: d.querySelector('p').textContent.trim() };
        }),
      );
      expect(visible).toEqual(fromSchema);
      expect(fromSchema.length).toBeGreaterThanOrEqual(3);
      expect(fromSchema.length).toBeLessThanOrEqual(5);
      for (const { q, a } of fromSchema) {
        const words = a.split(/\s+/).filter(Boolean).length;
        expect(words, `${q} (${words} words)`).toBeGreaterThanOrEqual(40);
        expect(words, `${q} (${words} words)`).toBeLessThanOrEqual(60);
      }
    });
  }
});
