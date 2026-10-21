// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

// Sitemap <lastmod> comes from git: the newest commit touching the page's own
// source or the shared layouts, components, data and lib it renders with.
// A shallow clone would give every page the same (wrong) date, so lastmod is
// left out then rather than guessed. The deploy build fetches full history.
function git(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}
const fullHistory = git(['rev-parse', '--is-shallow-repository']) === 'false';
const SHARED = ['src/layouts', 'src/components', 'src/data', 'src/lib', 'src/styles'];

function sourceFor(pathname) {
  const route = pathname.replace(/^\/|\/$/g, '') || 'index';
  return [`src/pages/${route}.astro`, `src/pages/${route}/index.astro`].find((f) => fs.existsSync(f));
}

function lastModified(pathname) {
  if (!fullHistory) return undefined;
  const source = sourceFor(pathname);
  if (!source) return undefined;
  const date = git(['log', '-1', '--format=%cI', '--', source, ...SHARED]);
  return date || undefined;
}

export default defineConfig({
  site: 'https://biblebedtime.uk',
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
    sitemap({
      serialize(item) {
        const lastmod = lastModified(new URL(item.url).pathname);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
  ],
});
