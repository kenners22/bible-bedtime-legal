// The site's one look: the full name in the header, a header that stays put
// with a menu on a phone, one wording for download buttons, one cream card a
// page, story paintings, the comparison table and the download page.
import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const dist = path.join(root, 'dist');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'src/data/catalog-snapshot.json'), 'utf8'));
const read = (rel) => fs.readFileSync(path.join(dist, rel), 'utf8');
const decode = (text) =>
  text.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”').replace(/&rsquo;/g, '’').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const textOf = (html) => decode(html.replace(/<script.*?<\/script>/gs, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');

function listHtml(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? listHtml(p) : p.endsWith('.html') ? [p] : [];
  });
}
const legacy = /[\\/](app|platform-info|callback|meta-ads-oauth)[\\/]index\.html$/;
const englishPages = listHtml(dist)
  .filter((f) => !legacy.test(f))
  .filter((f) => !f.endsWith(path.join('childrens-stories', 'index.html')))
  .filter((f) => /<html lang="en/.test(fs.readFileSync(f, 'utf8')));

async function gotoLocal(page, route) {
  await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('https://static.cloudflareinsights.com/**', (r) => r.abort());
  await page.goto(route, { waitUntil: 'domcontentloaded' });
}

test.describe('header', () => {
  test('every English page names "Bible Bedtimes" in the header, on one line', async ({ page }) => {
    expect(englishPages.length).toBeGreaterThan(45);
    for (const file of englishPages) {
      const html = fs.readFileSync(file, 'utf8');
      const header = html.match(/<header[\s\S]*?<\/header>/)[0];
      expect(textOf(header.match(/<span class="brand-name[^"]*"[^>]*>([\s\S]*?)<\/span>/)[0]).trim(), path.relative(dist, file)).toBe('Bible Bedtimes');
      expect(header, path.relative(dist, file)).not.toMatch(/Bible<br/);
    }
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await gotoLocal(page, '/psalms-for-sleep/');
      const name = page.locator('body > header .brand-name');
      const box = await name.boundingBox();
      const lineHeight = await name.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      expect(box.height, `name height at ${width}`).toBeLessThan(lineHeight * 1.6);
    }
  });

  test('the header stays at the top of the screen at 375 wide', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoLocal(page, '/psalms-for-sleep/');
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, 2500); });
    const box = await page.locator('body > header').boundingBox();
    expect(box.y).toBe(0);
    expect(Math.round((await page.locator('body > header > div').first().boundingBox()).height)).toBe(60);
    await expect(page.locator('body > header a.btn-gold')).toBeInViewport();
    await expect(page.locator('body > header a.btn-gold')).toHaveText('Get the app');
  });

  test('the phone menu opens with the five links, and Escape closes it', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoLocal(page, '/');
    const button = page.locator('body > header .menu-btn');
    const menu = page.locator('#site-menu');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeHidden();

    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(menu).toBeVisible();
    const links = menu.locator('a');
    await expect(links).toHaveText(['Bible Stories', 'Daily Scriptures', 'Devotionals', 'App', 'About']);
    expect(await links.evaluateAll((a) => a.map((l) => l.getAttribute('href')))).toEqual(['/bible-stories/', '/daily-scriptures/', '/devotionals/', '/download/', '/about/']);
    for (const box of await links.evaluateAll((a) => a.map((l) => l.getBoundingClientRect().height))) expect(box).toBeGreaterThanOrEqual(52);
    await expect(links.first()).toBeFocused();
    await expect(page.locator('.menu-scrim')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeHidden();
    await expect(button).toBeFocused();

    // It works from the keyboard too.
    await page.keyboard.press('Enter');
    await expect(menu).toBeVisible();
    await page.locator('.menu-scrim').click({ position: { x: 20, y: 600 } });
    await expect(menu).toBeHidden();
  });

  test('on a wide screen the five links are in the bar and there is no menu button', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoLocal(page, '/');
    await expect(page.locator('body > header .menu-btn')).toBeHidden();
    await expect(page.locator('body > header nav[aria-label="Primary"] a')).toHaveText(['Bible Stories', 'Daily Scriptures', 'Devotionals', 'App', 'About']);
    const bar = await page.locator('body > header > div').first().boundingBox();
    expect(Math.round(bar.height)).toBe(64);
    const button = await page.locator('body > header a.btn-gold').boundingBox();
    expect(Math.round(button.height)).toBe(48);
  });

  test('footer and menu links are 44px tall or more', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoLocal(page, '/');
    const heights = await page.locator('body > footer a').evaluateAll((links) => links.map((l) => l.getBoundingClientRect().height));
    expect(heights.length).toBeGreaterThan(10);
    for (const h of heights) expect(h).toBeGreaterThanOrEqual(44);
  });
});

test.describe('download buttons', () => {
  test('every button to the app says one thing and goes straight to the App Store with a tag', () => {
    const allowed = new Set(['Download on the App Store', 'Get the app', 'Listen in the app']);
    for (const file of englishPages) {
      const html = fs.readFileSync(file, 'utf8');
      const rel = path.relative(dist, file);
      for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
        const attrs = m[1];
        const href = attrs.match(/href="([^"]+)"/)?.[1]?.replaceAll('&amp;', '&') ?? '';
        const isButton = /class="[^"]*\bbtn-gold\b/.test(attrs);
        const toOurApp = href.startsWith('https://apps.apple.com/app/apple-store/id6773492861');
        if (!toOurApp) {
          // A gold button never stands for the App Store while going somewhere else first.
          if (isButton) expect(textOf(m[2]).trim(), `${rel} ${href}`).not.toMatch(/App Store|Get the app|Download/i);
          continue;
        }
        const words = textOf(m[2]).trim();
        // Buttons say one thing; the comparison page's text link names the app as it names the others.
        if (/class="[^"]*\bbtn-(gold|outline)\b/.test(attrs)) expect(allowed.has(words), `${rel}: "${words}"`).toBe(true);
        else expect(words, rel).toBe('Bible Bedtimes on the App Store');
        expect(new URL(href).searchParams.get('ct'), `${rel} ${href}`).toMatch(/^site_[a-z0-9_]+$/);
      }
    }
  });
});

test.describe('one cream card a page', () => {
  for (const [route, file, nights] of [
    ['/psalms-for-sleep/', 'psalms-for-sleep/index.html', 6],
    ['/bible-verses-for-sleep/', 'bible-verses-for-sleep/index.html', null],
  ]) {
    test(`${route} has exactly one cream card and puts the other verses on night panels`, async ({ page }) => {
      await gotoLocal(page, route);
      await expect(page.locator('.parchment-card')).toHaveCount(1);
      const html = read(file);
      const figures = [...html.matchAll(/<figure class="([^"]+)"/g)].map((m) => m[1]);
      expect(figures[0]).toContain('parchment-card');
      const night = figures.filter((c) => c.includes('night-panel')).length;
      if (nights) expect(night).toBe(nights);
      else expect(night).toBe(figures.length - 1);
    });
  }

  test('the psalms page has seven jump links and the app panel right after Psalm 23', () => {
    const html = read('psalms-for-sleep/index.html');
    const jump = html.match(/<nav aria-label="On this page"[\s\S]*?<\/nav>/)[0];
    const links = [...jump.matchAll(/href="#(psalm-\d+)"[^>]*>([^<]+)</g)];
    expect(links.map((m) => m[2])).toEqual(['Psalm 4', 'Psalm 23', 'Psalm 91', 'Psalm 121', 'Psalm 131', 'Psalm 139', 'Psalm 62']);
    for (const [, id] of links) expect(html).toContain(`id="${id}"`);
    const panel = html.indexOf('<aside class="panel app-panel');
    expect(panel).toBeGreaterThan(html.indexOf('id="psalm-23"'));
    expect(panel).toBeLessThan(html.indexOf('id="psalm-91"'));
    expect(html.match(/<aside class="panel app-panel/g)).toHaveLength(1);
  });

  test('no English page has more than one cream card', () => {
    for (const file of englishPages) {
      const html = fs.readFileSync(file, 'utf8');
      expect((html.match(/class="parchment-card/g) ?? []).length, path.relative(dist, file)).toBeLessThanOrEqual(1);
    }
  });
});

test.describe('story pages', () => {
  test('every story page shows its own painting and says where to find it in the app', () => {
    for (const story of catalog.stories) {
      const rel = `stories/${story.id}/index.html`;
      const html = read(rel);
      const text = textOf(html);
      const painting = `/assets/stories/${story.id}-1040-20261127.webp`;
      expect(html, rel).toContain(`src="${painting}"`);
      expect(fs.existsSync(path.join(dist, painting)), painting).toBe(true);
      expect(fs.statSync(path.join(dist, painting)).size, painting).toBeLessThan(125_000);
      expect(html, rel).toContain(`src="/assets/stories/${story.id}-blur-20261127.webp"`);
      expect(text, rel).toContain(`After you install: open Stories and choose ${story.title}.`);
      if (story.access === 'free') expect(text, rel).toContain('One of three complete stories that are free in Bible Bedtimes for iPhone and iPad, with a sleep timer.');
      else expect(text, rel).toContain('Free to download. You can play a 2-minute sample of this story first.');
      // Related stories show their paintings.
      const related = html.match(/<section aria-labelledby="related-heading"[\s\S]*?<\/section>/)[0];
      expect(related.match(/src="\/assets\/stories\/[a-z0-9-]+-480-20261127\.webp"/g), rel).toHaveLength(3);
    }
  });

  test('the painting loads, and sits beside the words on a wide screen and after the buttons on a phone', async ({ page }) => {
    const route = '/stories/genesis-creation-and-eden/';
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoLocal(page, route);
    const art = page.locator('img.story-art');
    await expect(art).toBeVisible();
    await expect.poll(() => art.evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);
    const wide = await art.boundingBox();
    const h1 = await page.locator('h1').boundingBox();
    expect(wide.x).toBeGreaterThan(h1.x + 400);
    expect(Math.round(wide.width)).toBe(520);

    await page.setViewportSize({ width: 375, height: 812 });
    const narrow = await art.boundingBox();
    const button = await page.locator('main a.btn-gold').boundingBox();
    expect(narrow.y).toBeGreaterThan(button.y + button.height);
  });

  test('the stories list shows each story’s painting and keeps its four pills', () => {
    const html = read('stories/index.html');
    for (const story of catalog.stories) expect(html, story.id).toContain(`src="/assets/stories/${story.id}-480-20261127.webp"`);
    const pills = html.match(/<nav aria-label="Story sections"[\s\S]*?<\/nav>/)[0];
    expect([...pills.matchAll(/<a [^>]*>([^<]+)<\/a>/g)].map((m) => m[1].trim())).toEqual(['Hour-long listens', 'Old Testament stories', 'New Testament stories', 'Psalms']);
  });
});

test.describe('comparison page', () => {
  test('a table on a wide screen and six cards on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoLocal(page, '/christian-sleep-app-comparison/');
    const table = page.locator('main table');
    await expect(table).toBeVisible();
    await expect(table.locator('thead th')).toHaveText(['App', 'What it is', 'For sleep', 'Price', 'Age rating']);
    await expect(table.locator('tbody tr')).toHaveCount(6);
    await expect(table.locator('tbody tr').first().locator('th')).toContainText('Bible Bedtimes');
    await expect(page.locator('.compare-cards')).toBeHidden();

    await page.setViewportSize({ width: 375, height: 812 });
    await expect(table).toBeHidden();
    await expect(page.locator('.compare-cards > section')).toHaveCount(6);
    await expect(page.locator('.compare-cards > section').first()).toBeVisible();
  });
});

test.describe('download page', () => {
  test('it states the price and shows a scan code on a wide screen only', async ({ page }) => {
    const html = read('download/index.html');
    expect(textOf(html)).toContain('Premium, when you want more £4.99 / $4.99 a month or £34.99 / $34.99 a year, each with a 2-week free trial. Apple shows your local price before you subscribe.');
    expect(decode(html.match(/data-link="([^"]+)"/)[1])).toBe('https://apps.apple.com/app/apple-store/id6773492861?pt=128800181&ct=site_download_qr&mt=8');

    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoLocal(page, '/download/');
    const code = page.locator('.scan-card');
    await expect(code).toBeVisible();
    await expect(code).toContainText('On a laptop? Scan this with your iPhone’s camera.');
    await expect.poll(() => code.locator('img').evaluate((img) => img.complete && img.naturalWidth > 0)).toBe(true);

    await page.setViewportSize({ width: 375, height: 812 });
    await expect(code).toBeHidden();
  });
});

test.describe('a page for a wrong address', () => {
  test('404.html has the site’s header, a way home, and is kept out of search', async ({ page }) => {
    const html = read('404.html');
    expect(html).toContain('<meta name="robots" content="noindex, follow">');
    expect(read('sitemap-0.xml')).not.toContain('404');
    await gotoLocal(page, '/404.html');
    await expect(page.locator('.eyebrow').first()).toHaveText('Page not found');
    await expect(page.locator('h1')).toHaveText('This page isn’t here.');
    await expect(page.locator('main')).toContainText('The address may be old or mistyped.');
    await expect(page.locator('main a.btn-gold')).toHaveText('Go to the home page');
    await expect(page.locator('main a.btn-gold')).toHaveAttribute('href', '/');
    await expect(page.locator('main a.btn-outline')).toHaveText('All stories');
    await expect(page.locator('main a.btn-outline')).toHaveAttribute('href', '/stories/');
    await expect(page.locator('body > header .brand-name')).toHaveText('Bible Bedtimes');
  });
});

test.describe('verses', () => {
  test('the About and Daily Scriptures bands quote the King James text the site uses elsewhere', () => {
    expect(textOf(read('about/index.html'))).toContain('“Come unto me, all ye that labour and are heavy laden, and I will give you rest.” — Matthew 11:28 (KJV)');
    expect(textOf(read('daily-scriptures/index.html'))).toContain('“This is the day which the LORD hath made; we will rejoice and be glad in it.” — Psalm 118:24 (KJV)');
  });
});

test.describe('after review', () => {
  // Every English page, as the other tests walk them.
  const tapPages = englishPages.map((file) => '/' + path.relative(dist, file).replace(/index\.html$/, '').split(path.sep).join('/'));
  for (const width of [390, 1280]) {
    test(`links, buttons and question rows that stand on their own are 44px tall or more at ${width}px`, async ({ page }) => {
      test.setTimeout(180_000);
      expect(tapPages.length).toBeGreaterThan(45);
      await page.setViewportSize({ width, height: 900 });
      const short = [];
      for (const route of tapPages) {
        await gotoLocal(page, route);
        const found = await page.locator('a[href], button, summary').evaluateAll((links) => links
          // Links inside a sentence are the one exception: a link in a paragraph, or one whose
          // own parent has words of its own beside it. A title alone in a heading or a bullet
          // that is only a link is pressed on its own, so it is checked.
          .filter((a) => {
            if (a.closest('p')) return false;
            const words = [...a.parentElement.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && /\p{L}/u.test(n.textContent));
            return !words;
          })
          .filter((a) => a.getClientRects().length > 0)
          .map((a) => ({ text: `${a.tagName.toLowerCase()} ${a.textContent.trim().slice(0, 40)}`, h: a.getBoundingClientRect().height }))
          .filter((l) => l.h < 43.5));
        for (const l of found) short.push(`${route} "${l.text}" ${Math.round(l.h)}px`);
      }
      expect(short).toEqual([]);
    });
  }

  test('with JavaScript off, the five header links show on a phone', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await gotoLocal(page, '/');
    const links = page.locator('#site-menu a');
    await expect(links).toHaveText(['Bible Stories', 'Daily Scriptures', 'Devotionals', 'App', 'About']);
    for (const link of await links.all()) await expect(link).toBeVisible();
    await expect(page.locator('body > header .menu-btn')).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await context.close();
  });

  test('widening the window with the menu open keeps the focus in the header', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoLocal(page, '/');
    await page.locator('body > header .menu-btn').click();
    await expect(page.locator('#site-menu a').first()).toBeFocused();
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.locator('#site-menu')).toBeHidden();
    await expect(page.locator('body > header nav[aria-label="Primary"] a').first()).toBeFocused();
  });

  test('the 404 page has no canonical address', () => {
    const html = read('404.html');
    expect(html).not.toContain('rel="canonical"');
    expect(html).not.toContain('og:url');
    expect(html).toContain('<meta name="robots" content="noindex, follow">');
  });

  test('the scan code script holds the same App Store link the download page builds', () => {
    const script = fs.readFileSync(path.join(root, 'scripts/download-qr.sh'), 'utf8');
    const fromScript = script.match(/^url='([^']+)'$/m)[1];
    const fromPage = decode(read('download/index.html').match(/data-link="([^"]+)"/)[1]);
    expect(fromScript).toBe(fromPage);
    expect(new URL(fromScript).searchParams.get('ct')).toBe('site_download_qr');
  });
});

test.describe('targets that stay in their line', () => {
  const spots = [
    ['/bible-verses-for-sleep/', 'nav[aria-label="Jump to a section"] li'],
    ['/bedtime-prayers-for-adults/', 'nav[aria-label="Prayers on this page"] li'],
    ['/', 'section[aria-labelledby="brief-heading"] dt'],
  ];
  for (const width of [390, 1280]) {
    test(`the jump lists and the facts titles keep their layout at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const [route, sel] of spots) {
        await gotoLocal(page, route);
        const rows = await page.locator(sel).evaluateAll((items) => items.map((item) => {
          const a = item.querySelector('a');
          const rects = a ? [...a.getClientRects()] : [];
          const box = a?.getBoundingClientRect();
          const count = item.querySelector('span');
          const words = item.getBoundingClientRect();
          return {
            hasLink: Boolean(a),
            box: box && { top: box.top, bottom: box.bottom, left: box.left, right: box.right, h: box.height },
            lastLineMid: rects.length ? (rects[rects.length - 1].top + rects[rects.length - 1].bottom) / 2 : null,
            countMid: count ? (count.getBoundingClientRect().top + count.getBoundingClientRect().bottom) / 2 : null,
            itemTop: words.top, itemBottom: words.bottom,
          };
        }));
        const linked = rows.filter((r) => r.hasLink);
        expect(linked.length, route).toBeGreaterThan(2);
        for (const r of linked) expect(r.box.h, route).toBeGreaterThanOrEqual(44);
        // No two links' targets overlap.
        for (let i = 0; i < linked.length; i++) for (let j = i + 1; j < linked.length; j++) {
          const a = linked[i].box, b = linked[j].box;
          const overlap = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
          expect(overlap, `${route} items ${i} and ${j}`).toBe(false);
        }
        // A count stays on the line of its question's last words.
        for (const r of linked) if (r.countMid !== null) expect(Math.abs(r.countMid - r.lastLineMid), route).toBeLessThan(4);
        if (route !== '/') {
          // The gap between items is the same whether an item takes one line or two.
          const gaps = rows.slice(1).map((r, i) => Math.round(r.itemTop - rows[i].itemBottom));
          expect(new Set(gaps).size, `${route} gaps ${gaps}`).toBe(1);
        } else {
          // A linked title sits level with an unlinked one in the same row of cards.
          const tops = await page.locator(sel).evaluateAll((items) => items.map((dt) => Math.round(dt.getBoundingClientRect().top)));
          const textTops = await page.locator(sel).evaluateAll((items) => items.map((dt) => {
            const walker = document.createTreeWalker(dt, NodeFilter.SHOW_TEXT);
            let node; while ((node = walker.nextNode()) && !/\p{L}/u.test(node.textContent));
            const r = document.createRange(); r.selectNodeContents(node);
            return Math.round(r.getBoundingClientRect().top - dt.getBoundingClientRect().top);
          }));
          expect(new Set(textTops).size, `facts title offsets ${textTops}`).toBe(1);
          expect(tops.length).toBe(6);
        }
      }
    });
  }

  test('without JavaScript the phone header scrolls away with the page', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await gotoLocal(page, '/stories/genesis-creation-and-eden/');
    await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, 1500); });
    const box = await page.locator('body > header').boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(0);
    await context.close();
  });

  test('the Spanish policy keeps its identifiers whole', () => {
    const html = read('privacy/bible-bedtime-espanol-ios/index.html');
    expect(html).not.toContain('break-all');
    expect(html.match(/<code class="[^"]*break-words[^"]*">/g)).toHaveLength(2);
  });
});

