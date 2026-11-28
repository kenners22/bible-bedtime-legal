// The two-minute sample player on story pages.
// The shipped list (src/data/samples.json) is empty, so the real site shows no
// player. The player itself is checked on a test-only build (dist-sample, made
// by `npm run build:sample`) that lists a one-second stand-in for one story and
// a missing file for another.
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

    await button.click();
    await expect(button).toHaveAttribute('data-state', 'paused');
    await expect(button).toHaveAttribute('aria-label', `Play the first two minutes of ${TITLE}`);
    expect(await page.locator('[data-sample] audio').evaluate((a) => a.paused)).toBe(true);

    // The stand-in is one second long: the time counts down from it, then the card goes back to the start.
    await button.click();
    await expect(page.locator('[data-sample-time]')).not.toHaveText('2:00');
    await expect(button).toHaveAttribute('data-state', 'paused', { timeout: 5_000 });
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
    await page.keyboard.press('Space');
    await expect(page.locator('[data-sample] button')).toHaveAttribute('data-state', 'paused');
    await expect(page.locator('.sample-time')).toContainText('Time left:');
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

  test('a story page with the player has no serious or critical axe violations', async ({ page }) => {
    await open(page, WITH);
    await expect(page.locator('[data-sample]')).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
    expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
  });
});
