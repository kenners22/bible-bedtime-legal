// A page's last change, from git: the newest commit touching the page's own
// source or the shared layouts, components, data and lib it renders with.
// Used for sitemap <lastmod> and guide dateModified. A shallow clone would
// give every page the same (wrong) date, so it returns undefined then rather
// than guessing. The deploy build fetches full history.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

/** @param {string[]} args */
function git(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

const fullHistory = git(['rev-parse', '--is-shallow-repository']) === 'false';
const SHARED = ['src/layouts', 'src/components', 'src/data', 'src/lib', 'src/styles'];
/** @type {Map<string, string | undefined>} */
const cache = new Map();

/** @param {string} pathname */
function sourceFor(pathname) {
  const route = pathname.replace(/^\/|\/$/g, '') || 'index';
  if (/^stories\/[^/]+$/.test(route)) return 'src/pages/stories/[id].astro';
  return [`src/pages/${route}.astro`, `src/pages/${route}/index.astro`].find((f) => fs.existsSync(f));
}

/**
 * ISO 8601 date of the last commit behind a page, or undefined without full history.
 * @param {string} pathname e.g. "/psalms-for-sleep/"
 * @returns {string | undefined}
 */
export function lastModified(pathname) {
  if (!fullHistory) return undefined;
  if (cache.has(pathname)) return cache.get(pathname);
  const source = sourceFor(pathname);
  const date = source ? git(['log', '-1', '--format=%cI', '--', source, ...SHARED]) || undefined : undefined;
  cache.set(pathname, date);
  return date;
}
