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
  test('the Smart App Banner is on English pages only, and a story page names its story', () => {
    const banner = '<meta name="apple-itunes-app" content="app-id=6773492861">';
    let storyPages = 0;
    for (const file of astroPages) {
      const rel = path.relative(dist, file);
      const html = fs.readFileSync(file, 'utf8');
      const english = /<html lang="en/.test(html) && rel !== path.join('childrens-stories', 'index.html');
      const story = rel.match(/^stories[\\/]([^\\/]+)[\\/]index\.html$/);
      if (story) {
        storyPages += 1;
        expect(html, rel).toContain(`<meta name="apple-itunes-app" content="app-id=6773492861, app-argument=https://biblebedtime.uk/stories/${story[1]}/">`);
      } else if (english) expect(html, rel).toContain(banner);
      else expect(html, rel).not.toContain('apple-itunes-app');
      expect(html.match(/apple-itunes-app/g)?.length ?? 0, rel).toBeLessThanOrEqual(1);
    }
    expect(storyPages).toBe(stories.length);
    expect(read('stories/index.html')).toContain(banner);
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

  test('psalms-for-sleep title and description match the before-bed searches and fit the snippet', () => {
    const html = read('psalms-for-sleep/index.html');
    const title = decode(html.match(/<title>([^<]+)<\/title>/)[1]);
    const description = decode(html.match(/<meta name="description" content="([^"]+)"/)[1]);
    expect(title.toLowerCase()).toContain('psalms before bed');
    expect(description.toLowerCase()).toContain('psalms to read before bed');
    expect(description.toLowerCase()).toContain('night time psalms');
    expect([...title].length).toBeLessThan(60);
    expect([...description].length).toBeLessThan(155);
  });

  test('bible-verses-for-sleep targets verses about sleep and rest and answers what the Bible says', () => {
    const html = read('bible-verses-for-sleep/index.html');
    const title = decode(html.match(/<title>([^<]+)<\/title>/)[1]);
    const description = decode(html.match(/<meta name="description" content="([^"]+)"/)[1]);
    expect(title).toMatch(/^Bible Verses About Sleep and Rest/);
    expect([...title].length).toBeLessThan(60);
    expect(description).toContain('Bible verses about sleep and rest');
    expect([...description].length).toBeLessThan(155);
    expect(html).toContain('<h2 id="what-the-bible-says">What does the Bible say about sleep?</h2>');
    const faq = jsonLd(html).find((d) => d['@type'] === 'FAQPage');
    expect(faq.mainEntity[0].name).toBe('What does the Bible say about sleep?');
  });

  test('every verse on bible-verses-for-sleep is real KJV text from kjv.json and the count matches', () => {
    const html = read('bible-verses-for-sleep/index.html');
    const quotes = [...html.matchAll(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/g)].map((m) => decode(m[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim());
    const texts = new Set(Object.values(kjv).map((p) => `“${p.text}”`));
    for (const q of quotes) expect(texts.has(q), q).toBe(true);
    expect(quotes.length).toBeGreaterThanOrEqual(30);
    expect(decode(html.match(/<h1\b[^>]*>([^<]+)<\/h1>/)[1])).toBe(`${quotes.length} Bible verses about sleep and rest`);
    expect(html.match(/<h2[^>]*>[^<]*\?<\/h2>/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
  });
});

const faqPages = ['/', '/bible-stories/', '/bible-sleep-stories/', '/bible-verses-for-sleep/', '/psalms-for-sleep/', '/bedtime-prayers-for-adults/', '/bible-bedtime-stories-for-kids/', '/christian-sleep-app-comparison/'];

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

test.describe('name, comparison and family pages', () => {
  const ppid = (html, ct) =>
    [...html.matchAll(/href="(https:\/\/apps\.apple\.com\/[^"]+)"/g)]
      .map((m) => new URL(m[1].replaceAll('&amp;', '&')))
      .filter((u) => u.searchParams.get('ct') === ct)
      .map((u) => u.searchParams.get('ppid'));

  test('the home page names a Christian sleep app, the prices and the different app with a similar name', () => {
    const html = read('index.html');
    const text = decode(html.replace(/<script.*?<\/script>/gs, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
    expect(decode(html.match(/<title>([^<]+)<\/title>/)[1])).toMatch(/^Bible Bedtimes: Christian Sleep App/);
    expect(text).toContain('Bible Bedtimes is a Christian sleep app');
    expect(text).toContain('£4.99 / $4.99 a month or £34.99 / $34.99 a year, each with a 2-week free trial');
    expect(text).toContain('All night (up to 10 hours)');
    expect(text).toContain('Bible Bedtimes is a different app from ‘Bedtime Bible’');
    expect(read('about/index.html')).toContain('Bible Bedtimes is a different app from ‘Bedtime Bible’.');
  });

  test('the comparison page is dated, links every app it compares and opens the adults product page', () => {
    const html = read('christian-sleep-app-comparison/index.html');
    expect(html).toContain('Checked November 2026');
    for (const id of ['726031617', '1405323394', '1490587079', '571800810', '1672878800']) {
      expect(html, id).toMatch(new RegExp(`href="https://apps\\.apple\\.com/us/app/[a-z0-9-]+/id${id}" rel="nofollow noopener"`));
    }
    const pages = ppid(html, 'site_compare');
    expect(pages.length).toBeGreaterThan(0);
    for (const p of pages) expect(p).toBe('1d9bac35-aca3-441c-9731-674d291d9b08');
  });

  test('the family page links every family story and opens the families product page', () => {
    const html = read('bible-bedtime-stories-for-kids/index.html');
    const family = ['noah-ark-and-rain', 'david-and-goliath', 'jonah-and-mercy', 'daniel-lions-den', 'jericho-the-quiet-march', 'through-the-sea-by-night', 'loaves-and-fishes', 'fiery-furnace'];
    for (const id of family) expect(html, id).toContain(`href="/stories/${id}/"`);
    const pages = ppid(html, 'site_kids');
    expect(pages.length).toBeGreaterThan(0);
    for (const p of pages) expect(p).toBe('722af402-73d0-48d1-be7f-f50c50aef4bf');
  });

  test('psalms-for-sleep links the Psalm 23 and Psalm 91 stories beside each psalm', () => {
    const html = read('psalms-for-sleep/index.html');
    const after = (heading, href) => html.indexOf(href, html.indexOf(heading)) < html.indexOf('<h2', html.indexOf(heading) + 1);
    expect(after('2. Psalm 23', 'href="/stories/psalm-23-the-shepherd/"')).toBe(true);
    expect(after('3. Psalm 91', 'href="/stories/psalm-91-under-the-shadow/"')).toBe(true);
  });
});
