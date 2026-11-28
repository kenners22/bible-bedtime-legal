// The two-minute sample player on story pages.
// The shipped list (src/data/samples.json) is empty, so the real site shows no
// player. The player itself is checked on a test-only build (dist-sample, made
// by `npm run build:sample`) that lists a ten-second quiet stand-in for one
// story and a missing file for another.
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const dist = path.join(root, 'dist');
const distSample = path.join(root, 'dist-sample');
const SAMPLE = 'http://127.0.0.1:18766';
const WITH = '/stories/genesis-creation-and-eden/';
const MISSING = '/stories/noah-ark-and-rain/';
const WITHOUT = '/stories/david-and-goliath/';
const TITLE = 'Genesis — Creation and Eden';
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'src/data/catalog-snapshot.json'), 'utf8'));

// The sound is really paused: well short of its end, and not moving.
async function expectHeld(page) {
  const audio = page.locator('[data-sample] audio');
  await expect.poll(() => audio.evaluate((a) => a.currentTime)).toBeGreaterThan(0);
  const at = await audio.evaluate((a) => a.currentTime);
  expect(at).toBeLessThan(8);
  await page.waitForTimeout(600);
  expect(await audio.evaluate((a) => ({ paused: a.paused, ended: a.ended, at: a.currentTime }))).toEqual({ paused: true, ended: false, at });
}

function listHtml(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? listHtml(p) : p.endsWith('.html') ? [p] : [];
  });
}

async function open(page, route, sounds = []) {
  await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('https://static.cloudflareinsights.com/**', (r) => r.abort());
  page.on('request', (r) => { if (/\.(m4a|mp3|aac)(\?|$)/.test(r.url())) sounds.push(r.url()); });
  await page.goto(`${SAMPLE}${route}`, { waitUntil: 'domcontentloaded' });
  return sounds;
}

test.describe('the shipped site', () => {
  test('the sample list is empty and no built page has a player', () => {
    expect(JSON.parse(fs.readFileSync(path.join(root, 'src/data/samples.json'), 'utf8'))).toEqual([]);
    const pages = listHtml(dist);
    expect(pages.length).toBeGreaterThan(40);
    for (const file of pages) {
      const html = fs.readFileSync(file, 'utf8');
      const rel = path.relative(dist, file);
      expect(html, rel).not.toContain('data-sample');
      expect(html, rel).not.toContain('<audio');
      expect(html, rel).not.toContain('Hear the first two minutes');
    }
    expect(fs.existsSync(path.join(dist, 'test-sample.m4a'))).toBe(false);
  });

  test('every listed sample is a known story and two minutes long', () => {
    const list = JSON.parse(fs.readFileSync(path.join(root, 'src/data/samples.json'), 'utf8'));
    const ids = new Set(catalog.stories.map((st) => st.id));
    expect(Array.isArray(list)).toBe(true);
    for (const entry of list) {
      expect(ids.has(entry.id), entry.id).toBe(true);
      expect(typeof entry.src, entry.id).toBe('string');
      // The resting time comes from the list and the count from the file: keep them the same.
      expect(entry.seconds, entry.id).toBe(120);
    }
  });

  test('a sample adds nothing to the title, description, headings or structured data', () => {
    const pick = (html) => ({
      title: html.match(/<title>.*?<\/title>/s)[0],
      description: html.match(/<meta name="description"[^>]*>/)[0],
      headings: html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/gs),
      data: html.match(/<script type="application\/ld\+json">.*?<\/script>/gs),
      banner: html.match(/<meta name="apple-itunes-app"[^>]*>/)[0],
    });
    const rel = path.join('stories', 'genesis-creation-and-eden', 'index.html');
    const plain = fs.readFileSync(path.join(dist, rel), 'utf8');
    const withSample = fs.readFileSync(path.join(distSample, rel), 'utf8');
    expect(withSample).toContain('data-sample');
    expect(pick(withSample)).toEqual(pick(plain));
  });
});

test.describe('the player, on a test build with a stand-in sample', () => {
  test('a story with a sample shows the card; one without shows nothing', async ({ page }) => {
    await open(page, WITH);
    const card = page.locator('[data-sample]');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Hear the first two minutes');
    await expect(card.locator('[data-sample-time]')).toHaveText('2:00');
    await expect(page.getByRole('button', { name: `Play the first two minutes of ${TITLE}` })).toBeVisible();
    await expect(card.locator('audio')).toHaveAttribute('preload', 'none');
    await expect(card.locator('audio')).not.toHaveAttribute('autoplay', /.*/);

    await page.goto(`${SAMPLE}${WITHOUT}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-sample]')).toHaveCount(0);
    await expect(page.locator('audio')).toHaveCount(0);
  });

  test('nothing is fetched before play; play and pause change the label and state; it counts down and resets', async ({ page }) => {
    const sounds = await open(page, WITH);
    await page.waitForLoadState('load');
    await page.waitForTimeout(500);
    expect(sounds).toEqual([]);

    const button = page.locator('[data-sample] button');
    await button.click();
    await expect(button).toHaveAttribute('data-state', 'playing');
    await expect(button).toHaveAttribute('aria-label', `Pause the first two minutes of ${TITLE}`);
    expect(sounds.some((u) => u.endsWith('/test-sample.m4a'))).toBe(true);
    await expect(page.locator('[data-sample-time]')).not.toHaveText('2:00');

    await expect.poll(() => page.locator('[data-sample] audio').evaluate((a) => a.currentTime)).toBeGreaterThan(0);
    await button.click();
    await expect(button).toHaveAttribute('data-state', 'paused');
    await expect(button).toHaveAttribute('aria-label', `Play the first two minutes of ${TITLE}`);
    await expectHeld(page);

    // Play on to the end (the stand-in is ten seconds): the card goes back to the start.
    await button.click();
    await expect(button).toHaveAttribute('data-state', 'playing');
    await expect(button).toHaveAttribute('data-state', 'paused', { timeout: 15_000 });
    await expect(page.locator('[data-sample-time]')).toHaveText('2:00');
    await expect(page.locator('[data-sample-fill]')).toHaveAttribute('style', /width: 0%/);
    await expect(page.locator('[data-sample-error]')).toBeEmpty();
  });

  test('it works from the keyboard, and a screen reader hears the time left', async ({ page }) => {
    await open(page, WITH);
    const button = page.getByRole('button', { name: `Play the first two minutes of ${TITLE}` });
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-sample] button')).toHaveAttribute('data-state', 'playing');
    await expect.poll(() => page.locator('[data-sample] audio').evaluate((a) => a.currentTime)).toBeGreaterThan(0);
    await page.keyboard.press('Space');
    await expect(page.locator('[data-sample] button')).toHaveAttribute('data-state', 'paused');
    await expectHeld(page);
    await expect(page.locator('.sample-time')).toContainText('Time left:');
  });

  test('shown again from the back-forward cache, the card is at rest', async ({ page }) => {
    await open(page, WITH);
    const button = page.locator('[data-sample] button');
    await button.click();
    await expect(page.locator('[data-sample-time]')).not.toHaveText('2:00');
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    await expect(button).toHaveAttribute('data-state', 'paused');
    await expect(button).toHaveAttribute('aria-label', `Play the first two minutes of ${TITLE}`);
    await expect(page.locator('[data-sample-time]')).toHaveText('2:00');
    await expect(page.locator('[data-sample-fill]')).toHaveAttribute('style', /width: 0%/);
    expect(await page.locator('[data-sample] audio').evaluate((a) => ({ paused: a.paused, at: a.currentTime }))).toEqual({ paused: true, at: 0 });
  });

  test('after a failed load and a return from the cache, the next press tries again', async ({ page }) => {
    const sounds = await open(page, MISSING);
    const button = page.locator('[data-sample] button');
    const line = page.locator('[data-sample-error]');
    await button.click();
    await expect(line).not.toBeEmpty();
    await expect.poll(() => sounds.length).toBe(1);
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    await expect(line).toBeEmpty();
    await button.click();
    await expect.poll(() => sounds.length).toBe(2);
    await expect(line).toHaveText('The sample didn’t load. Try again, or listen in the app.');
  });

  test('the play button is at least 44 by 44', async ({ page }) => {
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await open(page, WITH);
      const box = await page.locator('[data-sample] button').boundingBox();
      expect(box.width, `width at ${width}`).toBeGreaterThanOrEqual(44);
      expect(box.height, `height at ${width}`).toBeGreaterThanOrEqual(44);
    }
  });

  test('a sample that fails to load says so in a line and leaves the page alone', async ({ page }) => {
    await open(page, MISSING);
    const button = page.locator('[data-sample] button');
    await button.click();
    await expect(page.locator('[data-sample-error]')).toHaveText('The sample didn’t load. Try again, or listen in the app.');
    await expect(button).toHaveAttribute('data-state', 'paused');
    await expect(page.locator('[data-sample-time]')).toHaveText('2:00');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Listen in the app' })).toBeVisible();
    // Pressing play again tries again.
    await button.click();
    await expect(page.locator('[data-sample-error]')).toHaveText('The sample didn’t load. Try again, or listen in the app.');
  });

  for (const width of [390, 1280]) {
    test(`the card sits under the buttons at ${width} wide, with no sideways scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await open(page, WITH);
      const buttons = await page.locator('.story-b').boundingBox();
      const card = await page.locator('[data-sample]').boundingBox();
      const art = await page.locator('.story-art').boundingBox();
      const small = await page.locator('.story-p').boundingBox();
      expect(card.y).toBeGreaterThan(buttons.y + buttons.height - 1);
      expect(small.y).toBeGreaterThan(card.y + card.height - 1);
      if (width < 1024) expect(art.y).toBeGreaterThan(card.y + card.height - 1);
      else expect(art.x).toBeGreaterThan(card.x + card.width);
      expect(card.width).toBeLessThanOrEqual(520);
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(scroll).toBeLessThanOrEqual(0);
    });
  }

  test('without JavaScript a page with a sample looks like one without', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.route('https://fonts.googleapis.com/**', (r) => r.abort());
    await page.route('https://fonts.gstatic.com/**', (r) => r.abort());
    await page.route('https://static.cloudflareinsights.com/**', (r) => r.abort());
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      const heights = [];
      for (const origin of [SAMPLE, 'http://127.0.0.1:18765']) {
        await page.goto(`${origin}${WITH}`, { waitUntil: 'load' });
        if (origin === SAMPLE) {
          await expect(page.locator('[data-sample]')).toBeHidden();
        }
        heights.push(await page.evaluate(() => [document.documentElement.scrollHeight, document.querySelector('.story-p').getBoundingClientRect().top]));
      }
      expect(heights[0], `at ${width}`).toEqual(heights[1]);
    }
    await context.close();
  });

  test('a story page with the player has no serious or critical axe violations', async ({ page }) => {
    await open(page, WITH);
    await expect(page.locator('[data-sample]')).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
    expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
  });
});
