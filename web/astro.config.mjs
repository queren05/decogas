import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// SITE y BASE se pueden sobreescribir por variable de entorno para publicar en
// otro dominio sin tocar código, p. ej. el futuro decogas.com:
//   SITE=https://decogas.com BASE=/ npm run build
export default defineConfig({
  site: process.env.SITE || 'https://queren05.github.io',
  base: process.env.BASE || '/decogas',
  output: 'static',
  build: { format: 'file' },
  trailingSlash: 'ignore',
  integrations: [sitemap()],
});
