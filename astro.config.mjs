// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import { lastModified } from './src/lib/lastmod.mjs';

// Sitemap <lastmod> comes from git (see src/lib/lastmod.mjs).
export default defineConfig({
  site: 'https://biblebedtime.uk',
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
    sitemap({
      // /childrens-stories/ only forwards to /stories/; keep it out of the sitemap.
      filter: (page) => !page.endsWith('/childrens-stories/'),
      serialize(item) {
        const lastmod = lastModified(new URL(item.url).pathname);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
  ],
});
