import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const dist = path.join(root, 'dist');

// Every former placeholder route now has a real page. Add a route here only
// if the nav links to it before its page exists.
const knownDeadLinks = new Set([]);

const requiredAssets = [
  '/assets/home-hero-sunrise-20260602.png',
  '/assets/home-hero-sunrise-20260602.webp',
  '/assets/childrens-stories-hero-20260602.png',
  '/assets/childrens-stories-hero-20260602.webp',
  '/assets/bible-bedtime-logo-20260520.png',
  '/assets/bible-bedtime-logo-20260520.webp',
  '/assets/icon-book-20260602.png',
  '/assets/icon-cross-20260602.png',
  '/assets/icon-people-20260602.png',
  '/assets/leaf-decoration-20260602.png',
  '/assets/leaf-decoration-20260602.webp',
];

const fontPages = [
  'index.html',
  'childrens-stories/index.html',
  'terms/index.html',
  'privacy/index.html',
  'privacy/bible-bedtime-espanol-ios/index.html',
  'app/index.html',
  'platform-info/index.html',
];

function listFiles(dir, predicate) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(filePath, predicate);
    return predicate(filePath) ? [filePath] : [];
  });
}

function distPathForHref(href) {
  const urlPath = href.replace(/[?#].*$/, '');
  const decoded = decodeURIComponent(urlPath);
  const withoutLeadingSlash = decoded.replace(/^\//, '');
  const asDirectoryIndex = path.join(dist, withoutLeadingSlash, 'index.html');
  const asFile = path.join(dist, withoutLeadingSlash);
  const asHtml = path.join(dist, `${withoutLeadingSlash.replace(/\/$/, '')}.html`);

  if (fs.existsSync(asDirectoryIndex)) return asDirectoryIndex;
  if (fs.existsSync(asFile)) return asFile;
  if (fs.existsSync(asHtml)) return asHtml;
  return null;
}

test.describe('static output contract', () => {
  test('CNAME and .nojekyll are present for GitHub Pages', () => {
    expect(fs.readFileSync(path.join(dist, 'CNAME'), 'utf8').trim()).toBe('biblebedtime.uk');
    expect(fs.existsSync(path.join(dist, '.nojekyll'))).toBe(true);
  });

  test('every HTML route has exactly one h1, title, and meta description', () => {
    const htmlFiles = listFiles(dist, (filePath) => filePath.endsWith('.html'));
    const failures = [];

    for (const filePath of htmlFiles) {
      const html = fs.readFileSync(filePath, 'utf8');
      const relative = path.relative(dist, filePath);
      const h1Count = (html.match(/<h1\b/gi) ?? []).length;
      const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() ?? '';
      const description = html.match(/<meta\s+name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i)?.[1]?.trim() ?? '';

      if (h1Count !== 1) failures.push(`${relative}: expected 1 h1, found ${h1Count}`);
      if (!title) failures.push(`${relative}: missing or empty <title>`);
      if (!description) failures.push(`${relative}: missing or empty meta description`);
    }

    expect(failures).toEqual([]);
  });

  test('internal anchor links resolve, except documented placeholder routes', () => {
    const htmlFiles = listFiles(dist, (filePath) => filePath.endsWith('.html'));
    const broken = [];
    const confirmedKnownDeadLinks = new Set();

    for (const filePath of htmlFiles) {
      const html = fs.readFileSync(filePath, 'utf8');
      const relative = path.relative(dist, filePath);
      const hrefs = [...html.matchAll(/<a\b[^>]*\shref=["']([^"']+)["'][^>]*>/gi)]
        .map((match) => match[1])
        .filter((href) => href.startsWith('/') && !href.startsWith('//'));

      for (const href of hrefs) {
        const urlPath = href.replace(/[?#].*$/, '');
        if (knownDeadLinks.has(urlPath)) {
          confirmedKnownDeadLinks.add(urlPath);
          continue;
        }
        if (!distPathForHref(urlPath)) broken.push(`${relative}: ${href}`);
      }
    }

    expect(broken).toEqual([]);
    expect([...confirmedKnownDeadLinks].sort()).toEqual([...knownDeadLinks].sort());
  });

  test('Meta Ads OAuth callback is a fixed local PKCE bridge', () => {
    const html = fs.readFileSync(path.join(dist, 'meta-ads-oauth/index.html'), 'utf8');

    expect(html).toContain('http://127.0.0.1:64321/callback');
    expect(html).toContain("params.get('state')?.trim()");
    expect(html).toContain("params.get('code')?.trim()");
    expect(html).toContain("params.get('error')?.trim()");
    expect(html).toContain('Boolean(code) !== Boolean(error)');
    expect(html).toContain("window.history.replaceState(null, '', window.location.pathname)");
    expect(html).toContain('const allowedParams = [');
    expect(html).toContain('window.location.replace(destination.toString())');
    expect(html).not.toContain('destination.search = window.location.search');
    expect(html).not.toMatch(/params\.get\(['"](?:redirect|return|next|url)/i);
    expect(html).not.toContain('localStorage');
    expect(html).not.toContain('sessionStorage');
  });

  test('required hero, logo, and feature assets exist in dist', () => {
    const missing = requiredAssets.filter((assetPath) => !fs.existsSync(path.join(dist, assetPath)));
    expect(missing).toEqual([]);
  });

  test('Spanish iOS privacy page is app-specific and does not inherit the social OAuth policy', () => {
    const html = fs.readFileSync(path.join(dist, 'privacy/bible-bedtime-espanol-ios/index.html'), 'utf8');

    expect(html).toContain('<html lang="es-MX">');
    expect(html).toContain('uk.biblebedtime.espanol');
    expect(html).toContain('contenido-es.biblebedtime.uk');
    expect(html).toContain('StoreKit');
    expect(html).toContain('No usamos SDK de analítica');
    expect(html).toContain('https://biblebedtime.uk/privacy/bible-bedtime-espanol-ios/');
    expect(html).not.toContain('OAuth tokens');
    expect(html).not.toContain('official TikTok profile');
  });

  test('Meta Ads OAuth callback forwards only allowed parameters to the fixed local endpoint', async ({ page }) => {
    let callbackUrl = '';
    await page.route('http://127.0.0.1:64321/**', async (route) => {
      callbackUrl = route.request().url();
      await route.fulfill({ status: 200, body: 'local callback' });
    });

    await page.goto('/meta-ads-oauth/?code=abc%2B123&state=s1&redirect=https%3A%2F%2Fevil.example');
    await expect.poll(() => callbackUrl).not.toBe('');

    const callback = new URL(callbackUrl);
    expect(`${callback.origin}${callback.pathname}`).toBe('http://127.0.0.1:64321/callback');
    expect(callback.searchParams.get('code')).toBe('abc+123');
    expect(callback.searchParams.get('state')).toBe('s1');
    expect(callback.searchParams.has('redirect')).toBe(false);
  });

  test('Meta Ads OAuth callback scrubs rejected responses without forwarding them', async ({ page }) => {
    let callbackCalled = false;
    await page.route('http://127.0.0.1:64321/**', async (route) => {
      callbackCalled = true;
      await route.fulfill({ status: 200, body: 'unexpected callback' });
    });

    await page.goto('/meta-ads-oauth/?code=secret-without-state');
    await expect(page).toHaveURL('http://127.0.0.1:18765/meta-ads-oauth/');
    await expect(page.locator('#message')).toContainText('No valid Meta authorization response');
    expect(await page.textContent('body')).not.toContain('secret-without-state');
    expect(callbackCalled).toBe(false);
  });

  test('required pages include a loadable Google Fonts stylesheet', async () => {
    const failures = [];

    for (const relativePath of fontPages) {
      const html = fs.readFileSync(path.join(dist, relativePath), 'utf8');
      const fontHref = html.match(/<link\s+[^>]*href=["'](https:\/\/fonts\.googleapis\.com\/css2[^"']+)["'][^>]*>/i)?.[1]
        ?? '';

      if (!fontHref.includes('Cormorant+Garamond') || !fontHref.includes('family=Inter')) {
        failures.push(`${relativePath}: missing Cormorant Garamond + Inter Google Fonts stylesheet`);
        continue;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8_000);
      try {
        const response = await fetch(fontHref.replaceAll('&amp;', '&'), { signal: controller.signal });
        if (!response.ok) failures.push(`${relativePath}: Google Fonts returned HTTP ${response.status}`);
      } catch (error) {
        failures.push(`${relativePath}: Google Fonts request failed: ${error.name}`);
      } finally {
        clearTimeout(timeout);
      }
    }

    expect(failures).toEqual([]);
  });
});
