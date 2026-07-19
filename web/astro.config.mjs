import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://queren05.github.io',
  base: '/decogas',
  output: 'static',
  build: { format: 'file' },
  trailingSlash: 'ignore',
  integrations: [sitemap()],
});
