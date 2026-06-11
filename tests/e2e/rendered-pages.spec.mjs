import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import lighthouse from 'lighthouse';
import { chromium } from 'playwright';

const root = path.resolve(import.meta.dirname, '../..');
const baselineDir = path.join(root, 'tests/baseline');
const localOrigin = 'http://127.0.0.1:18765';

const astroRoutes = [
  '/',
  '/childrens-stories/',
  '/bible-stories/',
  '/daily-scriptures/',
  '/devotionals/',
  '/about/',
  '/childrens-emails/',
  '/terms/',
  '/privacy/',
];
const allRoutes = [...astroRoutes, '/app/', '/platform-info/', '/callback/'];
const viewports = [
  { width: 375, height: 900 },
  { width: 768, height: 1024 },
  { width: 1280, height: 900 },
  { width: 1440, height: 1000 },
];

function safeName(route) {
  return route === '/' ? 'home' : route.replace(/^\/|\/$/g, '').replaceAll('/', '-');
}

async function gotoLocal(page, route) {
  await page.route('https://fonts.googleapis.com/**', (requestRoute) => requestRoute.abort());
  await page.route('https://fonts.gstatic.com/**', (requestRoute) => requestRoute.abort());
  await page.goto(route, { waitUntil: 'domcontentloaded' });
}

test.describe('rendered pages', () => {
  for (const route of allRoutes) {
    for (const viewport of viewports) {
      test(`${route} has no horizontal scrollbar at ${viewport.width}px`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await gotoLocal(page, route);

        const overflow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));

        expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);

        // Baselines are only rewritten on demand (UPDATE_BASELINE=1 npm test),
        // never as a side effect of a normal run.
        if (viewport.width !== 1440 && process.env.UPDATE_BASELINE) {
          await page.screenshot({
            path: path.join(baselineDir, `${safeName(route)}-${viewport.width}.png`),
            fullPage: true,
          });
        }
      });
    }
  }

  test('home hero keeps desktop left-edge fade and wave clear of CTAs', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await gotoLocal(page, '/');

    const maskImage = await page.locator('.hero-photo').evaluate((element) => getComputedStyle(element).maskImage);
    const heroBox = await page.locator('.hero-photo').boundingBox();
    const ctaBox = await page.locator('main a[href="/daily-scriptures/"]').first().boundingBox();
    const featureBox = await page.locator('section[aria-label="What we offer"]').boundingBox();

    expect(maskImage).toContain('linear-gradient');
    expect(maskImage).toMatch(/(to right|90deg)/);
    expect(featureBox.y).toBeLessThanOrEqual(heroBox.y + heroBox.height + 24);
    expect(featureBox.y).toBeGreaterThan(ctaBox.y + ctaBox.height + 40);
  });

  test('Astro pages share the same header and footer chrome', async ({ page }) => {
    const snapshots = [];

    for (const route of astroRoutes) {
      await gotoLocal(page, route);
      snapshots.push({
        route,
        header: await page.locator('body > header').evaluate((element) => element.innerHTML.replace(/\s+/g, ' ').trim()),
        footer: await page.locator('body > footer').evaluate((element) => element.innerHTML.replace(/\s+/g, ' ').trim()),
        logo: await page.locator('body > header img').first().getAttribute('src'),
        navLinks: await page.locator('body > header nav[aria-label="Primary"] a').evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
        startFreeHref: await page.locator('body > header > div > a.btn-gold').getAttribute('href'),
      });
    }

    for (const snapshot of snapshots) {
      expect(snapshot.header, snapshot.route).toBe(snapshots[0].header);
      expect(snapshot.footer, snapshot.route).toBe(snapshots[0].footer);
      expect(snapshot.logo, snapshot.route).toBe('/assets/bible-bedtime-logo-20260520.webp');
      expect(snapshot.navLinks, snapshot.route).toEqual([
        '/bible-stories/',
        '/daily-scriptures/',
        '/devotionals/',
        '/childrens-stories/',
        '/app/',
        '/about/',
      ]);
      expect(snapshot.startFreeHref, snapshot.route).toBe('/daily-scriptures/');
    }
  });

  for (const route of allRoutes) {
    test(`${route} has no serious or critical axe violations`, async ({ page }) => {
      await gotoLocal(page, route);
      const results = await new AxeBuilder({ page }).analyze();
      const blocking = results.violations.filter((violation) => (
        violation.impact === 'serious' || violation.impact === 'critical'
      ));
      expect(blocking).toEqual([]);
    });
  }
});

test.describe.serial('lighthouse desktop audits', () => {
  test('accessibility is at least 95 and performance is at least 90', async () => {
    const port = 9223;
    const browser = await chromium.launch({
      args: [`--remote-debugging-port=${port}`],
    });
    const failures = [];

    try {
      for (const route of allRoutes) {
        const result = await lighthouse(`${localOrigin}${route}`, {
          port,
          output: 'json',
          logLevel: 'error',
          onlyCategories: ['accessibility', 'performance'],
          formFactor: 'desktop',
          screenEmulation: {
            mobile: false,
            width: 1350,
            height: 940,
            deviceScaleFactor: 1,
            disabled: false,
          },
        });
        const categories = result.lhr.categories;
        const accessibility = Math.round(categories.accessibility.score * 100);
        const performance = Math.round(categories.performance.score * 100);

        if (accessibility < 95) failures.push(`${route}: accessibility ${accessibility}`);
        if (performance < 90) failures.push(`${route}: performance ${performance}`);
      }
    } finally {
      await browser.close();
    }

    expect(failures).toEqual([]);
  });
});
