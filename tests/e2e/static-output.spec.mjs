import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const dist = path.join(root, 'dist');

const knownDeadLinks = new Set([
  '/bible-stories/',
  '/daily-scriptures/',
  '/devotionals/',
  '/about/',
  '/childrens-emails/',
]);

const requiredAssets = [
  '/assets/home-hero-sunrise-20260602.png',
  '/assets/childrens-stories-hero-20260602.png',
  '/assets/bible-bedtime-logo-20260520.png',
  '/assets/icon-book-20260602.png',
  '/assets/icon-cross-20260602.png',
  '/assets/icon-people-20260602.png',
  '/assets/leaf-decoration-20260602.png',
];

const fontPages = [
  'index.html',
  'childrens-stories/index.html',
  'terms/index.html',
  'privacy/index.html',
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

  test('required hero, logo, and feature assets exist in dist', () => {
    const missing = requiredAssets.filter((assetPath) => !fs.existsSync(path.join(dist, assetPath)));
    expect(missing).toEqual([]);
  });

  test('required pages include a loadable Google Fonts stylesheet', async () => {
    const failures = [];

    for (const relativePath of fontPages) {
      const html = fs.readFileSync(path.join(dist, relativePath), 'utf8');
      const fontHref = html.match(/<link\s+href=["'](https:\/\/fonts\.googleapis\.com\/css2[^"']+)["'][^>]*rel=["']stylesheet["'][^>]*>/i)?.[1]
        ?? html.match(/<link\s+rel=["']stylesheet["'][^>]*href=["'](https:\/\/fonts\.googleapis\.com\/css2[^"']+)["'][^>]*>/i)?.[1]
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
