// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://your-ecommerce-site.com',
  base: '/',
  integrations: [
    react(),
  ],
  output: 'static',
  build: {
    assets: '_astro',
    inlineStylesheets: 'auto',
  },
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      external: ['@strapi/strapi'],
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    },
  },
});