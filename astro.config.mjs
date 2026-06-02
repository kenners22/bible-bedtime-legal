// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://biblebedtime.uk',
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
  ],
});
